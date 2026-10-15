# TicketHub System Design Document

## 1. Requirements

- **Functional Requirements:**
  - Users can browse upcoming concerts and events.
  - Users can view real-time seating charts for a specific event.
  - Users can temporarily hold a seat while they complete the checkout process.
  - Users can securely pay for held seats to confirm an order.
  - Users can view a list of their purchased tickets.

- **Non-Functional Requirements:**
  - **Speed:** Read requests (browsing events) should have low latency (<200ms).
  - **Correctness:** The system must absolutely guarantee that a single seat is never double-booked or sold to two users.
  - **Fairness:** During high-demand flash sales, ticket allocation must operate on a strict first-come, first-served basis.

## 2. Load Estimates

**Normal Day Traffic:**

- **Page Views:** 50,000 visitors × 10 pages = 500,000 views/day.
  - _Views per second:_ 500,000 / 86,400 seconds ≈ **5.8 views/sec**.
- **Ticket Sales:** 5,000 tickets/day.
  - _Purchases per second:_ 5,000 / 86,400 seconds ≈ **0.06 purchases/sec**.

**"Big Sale" Peak Traffic:**

- **Page Views:** 200,000 users × 10 pages = 2,000,000 views in 10 minutes (600 seconds).
  - _Views per second:_ 2,000,000 / 600 = **3,333 views/sec**.
- **Ticket Sales:** 20,000 seats in 10 minutes.
  - _Purchases per second:_ 20,000 / 600 = **33.3 purchases/sec**.

**Comparison:**
During a big sale, the system experiences a ~574x spike in read throughput and a ~555x spike in write throughput concentrated entirely into a 10-minute window.

## 3. API Design

To ensure defensive programming, all endpoints use try/catch blocks and return standard HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500).

| Method | Path                      | Description                                                                                                                                         | Expected Status Codes                              |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| GET    | `/api/events`             | Retrieves a list of upcoming events. _Edge case: If no events exist, it gracefully returns a 200 OK with an empty array `[]` rather than an error._ | 200, 500                                           |
| GET    | `/api/events/{id}/seats`  | Fetches available seats for a specific event.                                                                                                       | 200, 400, 404                                      |
| POST   | `/api/seats/{id}/hold`    | Temporarily locks a seat for a user.                                                                                                                | 201, 400, 401, 404, 409 (Conflict if already held) |
| POST   | `/api/orders`             | Processes payment and finalizes the ticket purchase.                                                                                                | 201, 400, 401, 500                                 |
| GET    | `/api/users/{id}/tickets` | Lists a user's purchased tickets. _Edge case: Handled gracefully with an empty state UI if the user has 0 tickets._                                 | 200, 401, 403, 404                                 |

## 4. Data Model

- **`users`**: `id` (PK, Integer), `email` (Text, Unique), `password_hash` (Text).
- **`events`**: `id` (PK, Integer), `title` (Text), `event_date` (DateTime).
- **`seats`**: `id` (PK, Integer), `event_id` (FK to events.id, Integer), `seat_number` (Text), `status` (Text: 'available', 'held', 'sold').
- **`orders`**: `id` (PK, Integer), `user_id` (FK to users.id, Integer), `seat_id` (FK to seats.id, Integer), `created_at` (DateTime).

**Relationships:**

- One `event` has many `seats` (One-to-Many).
- One `user` has many `orders` (One-to-Many).
- One `seat` belongs to one `order` (One-to-One).

**Schema Trade-off: Surrogate ID vs. Composite Primary Key:**
When designing the `orders` table, we opted for a dedicated surrogate ID (`id` column) alongside a `UNIQUE(seat_id)` constraint, rather than using a composite primary key like `(user_id, seat_id)`. Using a surrogate ID makes single-record mutations and API routing (e.g., `PATCH /api/orders/{id}`) far simpler and less verbose for our ORM. Conversely, a composite primary key rigidly enforces uniqueness at the schema level without requiring an additional index, but makes specific record targeting unnecessarily complex during updates.

## 5. Concurrency & Double-Booking Prevention

We rely on a relational SQL database utilizing strict ACID transactions to prevent double-booking. When a user attempts to hold a seat, the backend executes:

```sql
BEGIN TRANSACTION;
SELECT * FROM seats WHERE id = 123 AND status = 'available' FOR UPDATE;
UPDATE seats SET status = 'held', user_id = 456 WHERE id = 123;
COMMIT;
```

The `FOR UPDATE` clause issues a row-level lock. If 1,000 users click the same seat at the exact same millisecond, the database forces their transactions into a sequential line. The first user succeeds; the subsequent 999 users will read the status as 'held' and fail. Furthermore, the `seat_id` column in the `orders` table possesses a `UNIQUE` constraint, making it schema-impossible to insert two confirmed orders for the same seat.

## 6. Architecture Diagram & Explanation

```text
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
    +------+------+-------------------+
    |             |                   |
[ Cache ]  [ Primary DB ]    [ Message Queue ] ---> [ Worker ]
(Redis)       (Writes)        (Async Tasks)      (Email/PDFs)
                  |
           [ Read Replica ]
               (Reads)
```

**Component Explanations:**

- **DNS:** Translates human-readable domain names into backend IP addresses.
- **CDN:** Caches static web assets close to the user globally to drastically reduce loading latency.
- **Object Storage:** A highly scalable flat-file storage system for retaining large binary files.
- **Pre-Signed URLs:** Allows clients to upload binary files (like event promotional banners) directly to Object Storage, bypassing the app servers entirely to save backend bandwidth.
- **Virtual Queue Room:** Throttles incoming users during peak traffic events, dripping them into the application at a sustainable rate.
- **Load Balancer:** Distributes incoming HTTP traffic evenly across all available app servers.
- **App Servers:** Stateless backend servers that handle business logic, validations, and database querying.
- **Cache (Redis):** Stores heavily accessed, volatile read data (like available event lists) in fast RAM.
- **Primary DB:** The definitive relational data store utilizing row-locking to safely write orders.
- **Read Replica:** A synchronized copy of the primary database used strictly to offload read-heavy queries.
- **Message Queue & Worker:** The queue receives slow tasks (like emailing tickets), allowing background workers to process them asynchronously without freezing the user's web request.

**Surviving the Big Sale:**
When 200,000 users hit the site, the **Virtual Queue Room** activates, absorbing the massive spike and only forwarding a manageable 500 users per second to the Load Balancer. All event browsing data is served directly from the **Cache (Redis)**, sparing the database from 3,333 views/sec. Only users who successfully hold a seat hit the **Primary DB** with write traffic, keeping the system stable under pressure.

## 7. Trade-offs

1. **Fairness vs. User Experience (Virtual Queue):** By routing users into a queue during the big sale, we intentionally degrade the immediate user experience (forcing them to wait) in exchange for total system stability and strict chronological fairness.
2. **Speed vs. Freshness (Caching):** By heavily caching the seating charts in Redis to handle read spikes, we embrace eventual consistency. Two users might briefly see the same seat as "available" on their screen, but our pessimistic locking at the database level will reject the slower user upon clicking checkout.
