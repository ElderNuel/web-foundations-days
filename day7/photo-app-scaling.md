# SnapShare Scaling Plan

## Assumptions & Daily Active Users

- **Registered Users:** 10,000,000
- **Daily Active Users (DAU):** 10% of registered users = 1,000,000 DAU.
- **Uploads:** 1 photo per day per DAU = 1,000,000 photos uploaded daily.
- **Feed Views:** 50 feed pages per day per DAU = 50,000,000 feed views daily.
- **Photo Size:** 2 MB per average photo.
- **Thumbnail Size:** 50 KB per thumbnail.
- **Seconds in a Day:** 86,400.

## Load Estimates

- **Uploads per second:** 1,000,000 uploads / 86,400 seconds ≈ 12 uploads/second.
- **Feed views per second (Average):** 50,000,000 views / 86,400 seconds ≈ 579 views/second.
- **Feed views per second (Peak):** 579 views/sec × 5 = 2,895 views/second.
- **Storage per year:**
  - **Daily Photo Storage:** 1,000,000 × 2 MB = 2,000,000 MB (2 TB).
  - **Daily Thumbnail Storage:** 1,000,000 × 50 KB = 50,000,000 KB (50 GB).
  - **Total Daily Storage:** ~2.05 TB/day.
  - **Storage per Year:** 2.05 TB × 365 days = ~748.25 TB/year.

## System Workload

The system is heavily **read-heavy**. With roughly 12 uploads per second compared to 579 feed views per second, the read-to-write ratio is nearly 50:1. This means the architectural design must aggressively utilize caching for feeds, Content Delivery Networks (CDNs) for static images, and database read replicas to handle the massive read traffic without overwhelming the primary database.

## Photo Storage Strategy

Photos should **not** be stored directly inside the relational database. Relational databases are optimized for structured data and rapid querying; storing large binary files (blobs) inside them drastically bloats the database size, degrades query performance, and makes routine backups painfully slow and expensive.

Instead, the actual photo and thumbnail files should be stored in **Object Storage** (like Amazon S3), while the database only stores the metadata (e.g., the URL pointer to the S3 object, upload timestamp, and user ID).

## Architecture Diagram

```text
       [ Clients / Mobile Devices ]
                 |
   +-------------+-------------+
   |                           |
[ DNS ]                     [ CDN ] (Serves Photos/Thumbnails)
   |                           |
[ Load Balancer ] <------------+
   |
   +---------+---------+
   |         |         |
[App 1]   [App 2]   [App 3] (Stateless App Servers)
   |         |         |
   +----+----+----+----+
        |         |
    [ Cache ]     | (Redis - Feed Data)
        |         |
        +---------+--------------------+-----------------------+
                  |                    |                       |
          [ Primary DB ]       [ Message Queue ]      [ Object Storage ] (S3)
          (Handles Writes)     (RabbitMQ / SQS)       (Stores actual images)
                  |                    |                       ^
          [ Read Replica ]      [ Worker Servers ]-------------+
          (Handles Reads)       (Generate Thumbnails)
```

## Component Explanations

- **DNS:** Translates the human-readable domain name (`snapshare.com`) into the IP address of the load balancer.
- **CDN (Content Delivery Network):** Stores copies of photos and thumbnails on edge servers globally to reduce latency for users downloading images.
- **Load Balancer:** Distributes incoming HTTP requests evenly across multiple healthy application servers to prevent any single server from becoming a bottleneck.
- **App Servers:** Stateless machines that execute the core business logic, validate requests, and coordinate data between the database, cache, and storage.
- **Cache:** Stores heavily accessed data (like users' pre-computed feed lists) in fast RAM to drastically reduce read queries hitting the database.
- **Primary Database:** The central source of truth that safely processes and records all write operations (new users, photo metadata) with ACID guarantees.
- **Read Replica:** A continuously updated copy of the primary database dedicated strictly to serving read queries, removing load from the primary node.
- **Object Storage:** A scalable, flat storage system optimized for holding massive amounts of unstructured binary data like photo files cheaply.
- **Message Queue:** Holds background tasks in a line so the app server can return a fast response to the user without waiting for slow processes to finish.
- **Worker:** Background servers that pull jobs from the message queue (like compressing and resizing photos) and process them asynchronously.

## Upload Flow

1. The user selects a photo on their device and submits the upload request to the app.
2. The request passes through the Load Balancer to an available App Server.
3. The App Server receives the binary photo data and saves the original photo directly into Object Storage (S3).
4. The App Server writes the photo's metadata (image URL, uploader ID, timestamp) to the Primary Database.
5. The App Server sends a "create thumbnail" job to the Message Queue containing the new photo's Object Storage URL.
6. The App Server immediately replies to the user with a `201 Created` success message.
7. _Asynchronously_, a Worker picks up the job from the queue, downloads the photo from Object Storage, generates the 50 KB thumbnail, saves the thumbnail back to Object Storage, and updates the database with the thumbnail URL.

## Trade-offs

1. **Speed versus Freshness (Caching):** By heavily caching user feeds in Redis to meet the 579 views/sec demand, we trade data freshness for speed. A newly uploaded photo by a followed user might take a few moments to appear in the cache (eventual consistency), meaning users might see a feed that is a few seconds out of date, but the feed will load instantly.

2. **Storage Cost versus Compute Performance:** Storing an extra 50 KB thumbnail for every single 2 MB photo increases our overall storage costs by 50 GB per day. However, this trade-off saves immense amounts of outbound bandwidth and client-side processing power, as the app doesn't have to send full 2 MB photos to a user simply scrolling past a grid of small images.
