const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.querySelector("#load-btn");
const submitBtn = document.querySelector("#submit-btn");
const statusEl = document.querySelector("#status");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const notesList = document.querySelector("#notes-list");

// Reusable fetch function with error throwing
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP Error: Status ${response.status}`);
  }
  return response.json();
}

// Function to handle empty states
function checkEmptyState() {
  if (notesList.children.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.textContent = "No notes available. Create one or load from server.";
    emptyLi.className = "empty-state";
    notesList.appendChild(emptyLi);
  } else {
    const emptyState = notesList.querySelector(".empty-state");
    if (emptyState) emptyState.remove();
  }
}

// Render a single note to the DOM securely
function appendNoteToDOM(note, prepend = false) {
  const li = document.createElement("li");
  li.className = "note-item";
  
  const titleEl = document.createElement("h3");
  titleEl.textContent = `${note.id}: ${note.title}`;
  
  const bodyEl = document.createElement("p");
  bodyEl.textContent = note.body || "No body content.";
  
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "delete-btn";
  deleteBtn.addEventListener("click", () => deleteNote(note.id, li));

  li.appendChild(titleEl);
  li.appendChild(bodyEl);
  li.appendChild(deleteBtn);

  if (prepend) {
    notesList.prepend(li);
  } else {
    notesList.appendChild(li);
  }
}

// Task 1: GET (Load Notes)
async function loadNotes() {
  try {
    loadBtn.disabled = true;
    submitBtn.disabled = true;
    statusEl.textContent = "Loading notes...";
    statusEl.className = "status-loading";
    notesList.innerHTML = "";

    const notes = await request(`${API_URL}?_limit=10`);
    
    notes.forEach(note => appendNoteToDOM(note));
    
    statusEl.textContent = `Loaded ${notes.length} notes from the server.`;
    statusEl.className = "status-success";
    checkEmptyState();
  } catch (error) {
    statusEl.textContent = `Error loading notes: ${error.message}. Please try again.`;
    statusEl.className = "status-error";
    checkEmptyState();
  } finally {
    loadBtn.disabled = false;
    submitBtn.disabled = false;
  }
}

// Task 2: POST (Create Note)
async function createNote(event) {
  event.preventDefault();
  
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  // Validation
  if (!title) {
    statusEl.textContent = "Validation Error: Title is required.";
    statusEl.className = "status-error";
    return;
  }
  if (title.length > 100) {
    statusEl.textContent = "Validation Error: Title cannot exceed 100 characters.";
    statusEl.className = "status-error";
    return;
  }

  try {
    submitBtn.disabled = true;
    loadBtn.disabled = true;
    statusEl.textContent = "Creating note...";
    statusEl.className = "status-loading";

    const newNoteData = { title, body, userId: 1 };
    
    const createdNote = await request(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNoteData)
    });

    appendNoteToDOM(createdNote, true);
    checkEmptyState();
    
    statusEl.textContent = `Note created (status 201, id ${createdNote.id}).`;
    statusEl.className = "status-success";
    
    titleInput.value = "";
    bodyInput.value = "";
  } catch (error) {
    statusEl.textContent = `Error creating note: ${error.message}`;
    statusEl.className = "status-error";
  } finally {
    submitBtn.disabled = false;
    loadBtn.disabled = false;
  }
}

// Task 3: DELETE (Remove Note)
async function deleteNote(id, listItem) {
  try {
    submitBtn.disabled = true;
    loadBtn.disabled = true;
    statusEl.textContent = "Deleting note...";
    statusEl.className = "status-loading";

    await request(`${API_URL}/${id}`, { method: 'DELETE' });

    listItem.remove();
    statusEl.textContent = `Note ${id} deleted successfully.`;
    statusEl.className = "status-success";
    checkEmptyState();
  } catch (error) {
    // APPROACH EXPLANATION: 
    // JSONPlaceholder doesn't persist POSTed notes. Creating a note returns a mock ID (e.g., 101).
    // Attempting to DELETE /posts/101 often results in a 404 Not Found since it's not in their static DB.
    // If we catch a 404 for an ID > 100, we treat it as a localized "success" so the UI functions as intended.
    if (error.message.includes("404") && id > 100) {
      listItem.remove();
      statusEl.textContent = `Local note ${id} deleted successfully.`;
      statusEl.className = "status-success";
      checkEmptyState();
    } else {
      statusEl.textContent = `Error deleting note: ${error.message}`;
      statusEl.className = "status-error";
    }
  } finally {
    submitBtn.disabled = false;
    loadBtn.disabled = false;
  }
}

// Event Listeners
loadBtn.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);

// Initialize empty state
checkEmptyState();