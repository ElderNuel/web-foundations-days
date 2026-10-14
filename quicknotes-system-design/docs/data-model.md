# QuickNotes Data Model

## Entities & Relationships
* **users**: Stores registered user details.
* **notes**: Stores individual note contents. 
  * *Relationship:* **One-to-Many** with users (One user has many notes; each note belongs to one user). This is established via the `user_id` foreign key.
* **tags**: Stores unique labels that can be applied to notes.
* **note_tags**: A junction table that enables a **Many-to-Many** relationship between notes and tags (A note can have multiple tags; a tag can apply to multiple notes). 

## CREATE TABLE Statements
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL CHECK (length(title) <= 100),
  body TEXT,
  category TEXT DEFAULT 'personal',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

## Example SQL Queries
**1. Insert a new note for user 1:**
```sql
INSERT INTO notes (user_id, title, body, category) 
VALUES (1, 'Grocery List', 'Milk, Bread, Eggs', 'personal');
```

**2. List all notes with the tag 'urgent' (Using JOIN):**
```sql
SELECT notes.title, notes.body 
FROM notes 
JOIN note_tags ON notes.id = note_tags.note_id 
JOIN tags ON note_tags.tag_id = tags.id 
WHERE tags.name = 'urgent';
```

**3. Count total notes per user:**
```sql
SELECT users.name, COUNT(notes.id) as total_notes 
FROM users 
LEFT JOIN notes ON users.id = notes.user_id 
GROUP BY users.id;
```

## Indexes
```sql
CREATE INDEX idx_notes_user_id ON notes(user_id);
```
**Reasoning:** Because QuickNotes relies on user authentication, almost every database query will filter notes by the user who owns them (`WHERE user_id = ?`). Without this index, the database would execute slow, full-table scans. With it, the database traverses a B-tree to locate the specific user's notes near-instantly.

## Database Justification: SQL vs NoSQL
For QuickNotes, a **SQL (relational) database** is the optimal choice. The application's data is highly structured, predictable, and heavily reliant on clear relationships (users own notes, notes share tags). SQL's ability to enforce normalized schemas, referential integrity via foreign keys, and `ON DELETE CASCADE` rules ensures data correctness natively. While NoSQL offers flexible schemas, the well-defined boundaries of note-taking entities make the strict guarantees of ACID transactions in a relational database more valuable than document flexibility.