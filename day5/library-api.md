# Library API Design

## Endpoints

* **List all books**
  * **Method:** GET
  * **Path:** `/api/books`
  * **Description:** Retrieves a complete list of all books currently available in the library.
  * **Success Status Code:** 200 OK

* **List books by an author**
  * **Method:** GET
  * **Path:** `/api/books?author={author_name}`
  * **Description:** Retrieves a list of books filtered by a specific author using a URL query parameter.
  * **Success Status Code:** 200 OK

* **Get one book**
  * **Method:** GET
  * **Path:** `/api/books/{id}`
  * **Description:** Retrieves the detailed information of a specific book by its unique ID.
  * **Success Status Code:** 200 OK

* **Create a new book**
  * **Method:** POST
  * **Path:** `/api/books`
  * **Description:** Adds a newly registered book to the library's collection.
  * **Request Body Example:** 
    ```json
    {
      "title": "Things Fall Apart",
      "author": "Chinua Achebe",
      "publishedYear": 1958
    }
    ```
  * **Success Status Code:** 201 Created

* **Update a book**
  * **Method:** PUT
  * **Path:** `/api/books/{id}`
  * **Description:** Updates or replaces the details of an existing book by its unique ID.
  * **Request Body Example:** 
    ```json
    {
      "title": "Things Fall Apart",
      "author": "Chinua Achebe",
      "publishedYear": 1958,
      "genre": "Historical Fiction"
    }
    ```
  * **Success Status Code:** 200 OK

* **Delete a book**
  * **Method:** DELETE
  * **Path:** `/api/books/{id}`
  * **Description:** Removes a specific book from the library database permanently by its unique ID.
  * **Success Status Code:** 204 No Content

## Error Codes

* **400 Bad Request**
  * **Example:** This error happens if a client attempts to create a new book via a POST request but fails to provide a required field in the request body (e.g., submitting the JSON without the `"title"` property) or sends a structurally malformed JSON payload.
* **404 Not Found**
  * **Example:** This error happens if a client sends a GET request to `/api/books/999` to view a specific book, but the ID `999` does not exist in the database.