# School Database Design

## Tables
* **students** - one row per student: id, name and a unique email.
* **courses** - one row per course: id, title and teacher.
* **enrolments** - one row per student per course, with the grade. Its primary key is the pair (student_id, course_id), so a student cannot be enrolled on the same course twice.

## Relationships
* Students and courses are **many-to-many**: a student takes many courses and a course has many students.
* A relational table cannot store a list of courses in one column, so the **enrolments join table** stores one row per pairing.
* This creates two **one-to-many** relationships: one student has many enrolments, and one course has many enrolments.

## Index
    CREATE INDEX idx_enrolments_course ON enrolments(course_id);

The primary key already makes lookups by student fast (student_id comes first). Teachers will often ask "who is on my course?", which searches by course_id, so a separate index on course_id speeds up that query.

## Primary Key Trade-offs: Composite vs. Dedicated ID
When designing the `enrolments` table, we used a composite primary key `(student_id, course_id)`. 
* **Composite Primary Key:** This natively enforces that a student can only enroll in a specific course once without needing a separate unique constraint. However, the trade-off is that updating a specific record (like updating a grade) requires routing and querying using both IDs in the `WHERE` clause, which can make API endpoints and ORM mutations slightly more verbose.
* **Dedicated Enrolment ID:** Using a dedicated surrogate ID (e.g., `id INTEGER PRIMARY KEY`) alongside a `UNIQUE(student_id, course_id)` constraint makes it easier to target a single enrollment directly for updates (e.g., `PATCH /api/enrolments/{id}`). The trade-off is that it adds an extra column and an additional unique index to the database, slightly increasing storage requirements.

## SQL or NoSQL?
SQL is the better choice. The data is highly structured and the relationships matter: every enrolment must point to a real student and a real course, a student must not enrol twice, and grades must not be lost. A relational database enforces all of these rules with keys and constraints, and JOINs answer questions like "all students on this course" easily.