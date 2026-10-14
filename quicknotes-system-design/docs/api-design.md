# QuickNotes API Design

## REST Endpoints

| Method | Path | Description | Success Status |
|--------|------|-------------|----------------|
| GET | `/api/notes` | Retrieves a list of all notes belonging to the authenticated user. | 200 OK |
| GET | `/api/notes/{id}` | Retrieves the details of a specific note by its unique ID. | 200 OK |
| GET | `/api/notes?category={category}` | Retrieves a list of notes filtered by a specific category query parameter. | 200 OK |
| POST | `/api/notes` | Creates a new note for the authenticated user. | 201 Created |
| PATCH | `/api/notes/{id}` | Partially updates fields (like title or body) of an existing note. | 200 OK |
| DELETE | `/api/notes/{id}` | Permanently deletes a specific note by its ID. | 204 No Content |

## JSON Examples

### Creating a Note (POST `/api/notes`)
**Request Body:**
```json
{
  "title": "System Design Prep",
  "body": "Review load balancers and caching strategies before the interview.",
  "category": "study"
}
```

**Response Body (201 Created):**
```json
{
  "id": 105,
  "user_id": 1,
  "title": "System Design Prep",
  "body": "Review load balancers and caching strategies before the interview.",
  "category": "study",
  "created_at": "2026-10-14T19:01:00Z"
}
```

### Listing Notes (GET `/api/notes`)
**Response Body (200 OK):**
```json
[
  {
    "id": 105,
    "title": "System Design Prep",
    "category": "study",
    "created_at": "2026-10-14T19:01:00Z"
  },
  {
    "id": 102,
    "title": "Groceries",
    "category": "personal",
    "created_at": "2026-10-13T10:15:00Z"
  }
]
```

## Error Codes
The API utilizes standard HTTP status codes to indicate client or server errors:

* **400 Bad Request:** Occurs if the client submits invalid data, such as attempting to POST a note without the required `title` field.
* **401 Unauthorized:** Occurs if the client makes a request without a valid authentication token in the headers.
* **403 Forbidden:** Occurs if the authenticated user attempts to modify or delete a note that belongs to a different user.
* **404 Not Found:** Occurs if the client attempts to GET, PATCH, or DELETE a note ID that does not exist in the database.
* **500 Internal Server Error:** Occurs if the server encounters an unexpected crash or database connectivity failure.

**Example Error Response Body (400 Bad Request):**
```json
{
  "error": "Validation failed: 'title' is a required field.",
  "code": 400
}
```