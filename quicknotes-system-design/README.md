# QuickNotes System Design & API Client

## Description
QuickNotes has evolved from a local browser application into a scalable, high-performance system design architecture capable of supporting 1 million users. This repository proves the client-side interaction with a RESTful backend using modern JavaScript `fetch` and provides the comprehensive architectural blueprints required by backend engineering teams to build the live production system.

## How to Run the API Client
1. Clone or download this repository to your local machine.
2. Open `index.html` in any modern web browser (e.g., Chrome, Firefox) or use the VS Code Live Server extension.
3. Test the interface by loading notes from the mock API, creating new notes via the form, and deleting them from the feed.

## Documentation Links
The backend engineering specs are located in the `docs/` folder:
* [API Design](docs/api-design.md) - Endpoints, JSON schemas, and error codes.
* [Data Model](docs/data-model.md) - SQL schemas, relationships, indexes, and queries.
* [Scaled Architecture](docs/architecture.md) - Component breakdowns, load estimates, text diagrams, and trade-offs.

## What I Learned
* **API Integration & Error Handling:** How to successfully interact with external REST APIs using `async/await`, manage localized UI states based on JSON responses, and gracefully handle specific backend anomalies (like JSONPlaceholder 404s).
* **Defensive DOM Manipulation:** Re-inforced the importance of utilizing `document.createElement()` and `textContent` when mapping JSON payloads to the DOM to completely mitigate Cross-Site Scripting (XSS) risks.
* **Distributed Systems Architecture:** How horizontal scaling, message queues, and caching mitigate latency and throughput bottlenecks, and how to effectively analyze system constraints using back-of-the-envelope estimations.