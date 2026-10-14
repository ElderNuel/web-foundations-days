# QuickNotes Scaled Architecture

## Requirements
* **Functional:** Users can create text notes, view a list of their saved notes, assign categories/tags, and delete notes.
* **Non-functional:** The system must be highly available (99.9% uptime), maintain low latency for read operations (<200ms), and handle traffic gracefully without single points of failure.

## Load Estimates (For 1 Million Users)
Assuming 20% Daily Active Users (DAU) = 200,000 DAU.
* **Writes per second:** 200k DAU × 5 notes per day = 1,000,000 writes/day. 
  * `1,000,000 / 86,400 seconds` = **~12 writes per second.**
* **Reads per second:** 200k DAU × 20 reads per day = 4,000,000 reads/day.
  * `4,000,000 / 86,400 seconds` = **~46 reads per second.**
* **Storage per year:** 1,000,000 new notes/day × 500 bytes per note = 500 MB/day.
  * `500 MB × 365 days` = **~182.5 GB of storage per year.**

## Architecture Diagram
```text
       [ Clients / Browsers ]
                 |
   +-------------+-------------+
   |                           |
[ DNS ]                     [ CDN ] (Serves index.html, style.css, script.js)
   |
[ Load Balancer ]
   |
   +-------------------+-------------------+
   |                   |                   |
[App Server 1]    [App Server 2]    [App Server 3]
   |                   |                   |
   +---------+---------+---------+---------+
             |                   |
         [ Cache ]        [ Message Queue ] ---> [ Worker ] (Handles exports/emails)
        (Redis RAM)              |
             |                   |
        +----+-------------------+
        |                        |
[ Primary Database ]      [ Read Replica ]
(Handles all Writes)     (Handles all Reads)
```

## Component Explanations
* **Client / Browser:** Provides the user interface and handles local input execution.
* **DNS:** Converts the domain name into the numerical IP address of the load balancer.
* **CDN (Content Delivery Network):** Stores copies of static assets (CSS, JS, images) close to the user's geographical location to minimize latency.
* **Load Balancer:** Evenly distributes API requests across multiple application servers so no single machine gets overwhelmed.
* **App Servers (1, 2, 3):** Stateless machines that execute the application's backend logic, such as validation and database querying.
* **Cache (Redis):** Stores frequently requested data (like a user's note list) in ultra-fast memory to drastically cut down database read times.
* **Primary Database:** The central SQL database that strictly handles and records all write, update, and delete queries.
* **Read Replica:** A synchronized clone of the primary database dedicated solely to processing read queries to distribute the system load.
* **Message Queue:** A queue system that receives slow, background tasks so the app servers can immediately respond to user requests.
* **Worker:** A background server that pulls jobs from the message queue (e.g., generating PDF exports of notes) and processes them out of band.

## Step-by-Step Request Flows

**Flow for `GET /notes`:**
1. The client requests `/notes`, passing through DNS and the Load Balancer, which routes to App Server 1.
2. App Server 1 checks the Cache (Redis) for the user's note list. 
3. *Cache Hit:* If found, it returns the data immediately. 
4. *Cache Miss:* If not found, it queries the Read Replica, formats the JSON, stores a copy in the Cache for the next request, and sends the response.

**Flow for `POST /notes`:**
1. The client sends note data to the Load Balancer, routing it to App Server 2.
2. App Server 2 validates the payload (e.g., checks title length).
3. The server writes the new note into the Primary Database.
4. The server actively invalidates (deletes) the user's stale note list stored in the Cache.
5. The server returns a `201 Created` status to the client, while the Primary Database silently propagates the new row to the Read Replica.

## Trade-offs & Single Points of Failure
* **Trade-off 1: Speed vs. Freshness.** By relying heavily on Cache and Read Replicas, we achieve massive speed improvements. The trade-off is *eventual consistency*; if replication lags by a few milliseconds, a user pulling their notes instantly after creating one might briefly see a stale list.
* **Trade-off 2: Simplicity vs. Scalability.** Introducing load balancers, caching layers, and queues makes the system highly scalable but trades off operational simplicity. Debugging requires tracing logs across multiple distributed servers instead of checking a single monolith.
* **Avoiding Single Points of Failure (SPOF):** Deploying multiple App Servers horizontally behind a Load Balancer ensures that if one server crashes, traffic routes to the survivors. Similarly, maintaining a Read Replica allows it to be promoted to a Primary Database via failover protocols if the main database node goes offline.