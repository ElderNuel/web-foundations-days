# TicketHub System Design Document

## 1. Requirements
* **Functional Requirements:**
  * Users can browse upcoming concerts and events.
  * Users can view real-time seating charts for a specific event.
  * Users can temporarily hold a seat while they complete the checkout process.
  * Users can securely pay for held seats to confirm an order.
  * Users can view a list of their purchased tickets.
* **Non-Functional Requirements:**
  * **Speed:** Read requests (browsing events and seating charts) must maintain low latency (<200ms).
  * **Correctness:** The system must absolutely guarantee that a single seat is never double-booked or sold to two users.
  * **Fairness:** During high-demand flash sales, ticket allocation must operate on a strict first-come, first-served basis without dropping connections.

## 2. Load Estimates
**Normal Day Traffic:**
* **Page Views:** 50,000 visitors × 10 pages = 500,000 views/day.
  * *Views per second:* 500,000 / 86,400 seconds ≈ **5.8 views/sec**.
* **Ticket Sales:** 5,000 tickets/day.
  * *Purchases per second:* 5,000 / 86,400 seconds ≈ **0.06 purchases/sec**.

**"Big Sale" Peak Traffic:**
* **Page Views:** 200,000 users × 10 pages = 2,000,000 views in 10 minutes (600 seconds).
  * *Views per second:* 2,000,000 / 600 ≈ **3,333 views/sec**.
* **Ticket Sales:** 20,000 seats in 10 minutes.
  * *Purchases per second:* 20,000 / 600 ≈ **33.3 purchases/sec**.

**Comparison:** 
During a big sale, the system experiences an enormous ~574x spike in read throughput and a ~555x spike in write throughput, concentrated entirely into a 10-minute window. This necessitates aggressive caching and traffic throttling.

## 3. API Design
To enforce defensive programming, all endpoints utilize try/catch blocks, validate incoming payloads, and return standard HTTP status codes. 

| Method | Path | Description | Expected Status Codes |
|--------|------|-------------|-----------------------|
| GET | `/api/events` | Retrieves a list of upcoming events. *Edge case: If no events exist, it gracefully returns a 200 OK with an empty array `[]` rather than an error.* | 200, 500 |
| GET | `/api/events/{id}/seats` | Fetches available seats for a specific event. | 200, 400, 404 |
| POST | `/api/seats/{id}/hold` | Temporarily locks a seat for a user and sets a TTL. | 201, 400, 401, 404, 409 (Conflict if already held) |
| POST | `/api/orders` | Processes payment and finalizes the ticket purchase. | 201, 400, 401, 500 |
| GET | `/api/users/{id}/tickets` | Lists a user's purchased tickets. *Edge case: Handled gracefully with an empty state UI if the user has 0 tickets.* | 200, 401, 403, 404 |

## 4. Data Model

* **`users`**: `id` (PK, Integer), `email` (Text, Unique), `password_hash` (Text).
* **`events`**: `id` (PK, Integer), `title` (Text), `event_date` (DateTime).
* **`seats`**: `id` (PK, Integer), `event_id` (FK to events.id, Integer), `seat_number` (Text), `status` (Text: 'available', 'held', 'sold'), `held_until` (DateTime, Nullable).
* **`orders`**: `id` (PK, Integer), `user_id` (FK to users.id, Integer), `seat_id` (FK to seats.id, Integer, Unique), `created_at` (DateTime).

**Relationships:**
* One `event` has many `seats` (One-to-Many).
* One `user` has many `orders` (One-to-Many).
* One `seat` belongs to one `order` (One-to-One).

**Schema Trade-off: Surrogate ID vs. Composite Primary Key:**
For the `orders` table, we opted for a dedicated surrogate ID (`id` column) alongside a `UNIQUE(seat_id)` constraint rather than using a composite primary key like `(user_id, seat_id)`. Using a surrogate ID makes single-record mutations and specific API routing (e.g., `PATCH /api/orders/{id}`) much simpler and less verbose for the application's ORM. Conversely, a composite primary key rigidly enforces uniqueness at the schema level without requiring an additional index but makes specific record targeting complex if an order needs to be updated or refunded independently of the user-seat pairing.

## 5. Concurrency & Double-Booking Prevention
The system relies on a relational SQL database utilizing strict ACID transactions and row-level locking to prevent double-booking. To prevent artificially drying up inventory when users abandon their carts, the system utilizes "on-the-spot" reclamation alongside a background cleanup job. When a user attempts to hold a seat, the backend executes:

    BEGIN TRANSACTION;
    
    SELECT * FROM seats 
    WHERE id = 123 
      AND (status = 'available' OR (status = 'held' AND held_until < NOW())) 
    FOR UPDATE;
    
    UPDATE seats 
    SET status = 'held', user_id = 456, held_until = NOW() + INTERVAL '10 minutes' 
    WHERE id = 123;
    
    COMMIT;

The `FOR UPDATE` clause issues a row-level lock. By checking if `held_until < NOW()` directly in the `WHERE` clause, incoming users can instantly claim a stale seat from an abandoned cart without waiting for a scheduled cron job to sweep the database. If thousands of users click the same seat simultaneously, the database forces their transactions into a sequential queue. The first user succeeds; subsequent users will read the newly updated 'held' status (with a future timestamp) and fail. The `UNIQUE(seat_id)` constraint on the `orders` table serves as an impenetrable secondary defense mechanism against double-booking completed purchases.

## 6. Architecture Diagram & Explanation

           [ Users ]
               |
           [ DNS ]
               |
           [ CDN ] ------------------------> [ Object Storage (S3) ]
               |                                       ^
     [ Virtual Queue Room ]                            | (Pre-signed URL direct uploads)
               |                                       |
        [ Load Balancer ]                              |
               |                                       |
     +---------+---------+---------+                   |
     |                   |         |                   |
    [App 1]           [App 2]   [App 3] ---------------+
     |                   |         |
     +---------+---------+---------+
               |
        +------+------+-------------------+-----------------+
        |             |                   |                 |
    [ Cache ]  [ Primary DB ]    [ Message Queue ] ---> [ Worker ]
    (Redis)       (Writes)        (Async Tasks)      (Emails/Cleanup)
                      |
               [ Read Replica ]
                   (Reads)

**Component Explanations:**
* **DNS:** Translates human-readable domain names into the load balancer's IP address.
* **CDN:** Caches static web assets and promotional images close to the user globally to drastically reduce loading latency.
* **Object Storage:** A highly scalable flat-file storage system for retaining large binary files. 
* **Pre-Signed URLs:** Allows clients (e.g., event organizers) to upload binary files directly to Object Storage, bypassing the app servers entirely to save backend bandwidth.
* **Virtual Queue Room:** Throttles incoming users during peak traffic events, dripping them into the application at a sustainable rate to prevent server crashes.
* **Load Balancer:** Distributes incoming HTTP traffic evenly across all available app servers.
* **App Servers:** Stateless backend servers that handle business logic, validations, and database querying.
* **Cache (Redis):** Stores heavily accessed, volatile read data (like available event lists and seating availability) in fast RAM.
* **Primary DB:** The definitive relational data store utilizing row-locking to safely write holds and orders.
* **Read Replica:** A synchronized copy of the primary database used strictly to offload read-heavy queries.
* **Message Queue & Worker:** The queue receives slow tasks (like emailing tickets or running secondary database sweeps), allowing background workers to process them asynchronously without freezing the user's web request.

**Surviving the Big Sale:**
When 200,000 users flood the site, the **Virtual Queue Room** absorbs the initial shock, smoothing out the 555-fold write spike by forwarding a manageable subset of users to the Load Balancer. Read traffic (3,333 views/sec) is handled primarily by the **CDN** and the **Cache (Redis)**, sparing the database. Only users who successfully initiate a hold reach the **Primary DB**, keeping raw socket connections low and ensuring the system remains responsive.

## 7. Trade-offs
1. **Speed vs. Freshness (Caching):** By heavily caching the seating charts in Redis to handle the massive read spikes, we embrace eventual consistency. Two users might briefly see the same seat as "available" on their screen, but our pessimistic locking at the database level guarantees correctness by rejecting the slower user upon clicking the hold button.
2. **Fairness vs. User Experience (Virtual Queue):** By routing users into a virtual waiting room during the big sale, we intentionally degrade the immediate user experience (forcing them to wait) in exchange for total system stability and strict chronological fairness.