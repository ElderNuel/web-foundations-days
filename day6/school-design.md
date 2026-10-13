# School Database Design

## Table Explanations
* **`students`**: Stores individual student records, including a unique auto-incrementing identifier, their full name, and a unique email address to prevent duplicate registrations.
* **`courses`**: Stores the available classes or modules, containing a unique identifier and the course title.
* **`enrolments`**: A junction (or join) table that bridges the gap between students and courses. It records which student is taking which course and also stores the specific grade for that pairing.

## Relationships
* **One-to-Many**: A single student can have many enrolments, and a single course can have many enrolments. Therefore, both the `students` to `enrolments` relationship and the `courses` to `enrolments` relationship are one-to-many[cite: 6]. 
* **Many-to-Many**: The relationship directly between `students` and `courses` is many-to-many (one student takes multiple courses; one course has multiple students)[cite: 6].
* **Why a Join Table is Needed**: Relational databases enforce normalization, meaning each column should hold exactly one value[cite: 6]. We cannot effectively store a comma-separated list of courses inside a student's row (e.g., `courses = "Math, Science"`) because it makes searching, updating, and enforcing referential integrity extremely difficult[cite: 6]. The `enrolments` join table resolves this by holding pairs of IDs, allowing us to strictly map the many-to-many relationship using a composite primary key to prevent duplicate enrollments[cite: 6].

## Recommended Index
I would add an index to the `course_id` column in the `enrolments` table:
`CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);`
**Reason**: While primary keys (like `id` in `students` and the composite primary key starting with `student_id` in `enrolments`) are indexed automatically[cite: 6], foreign keys that act as the second part of a composite key are often not. Because this application will frequently run queries like "find all students on one course" or "count the number of students per course," the database will need to search heavily by `course_id`. Adding an index provides a sorted structure for `course_id`, enabling the database to jump directly to the required rows instead of performing a slow, full table scan[cite: 6].

## Database Choice: SQL vs NoSQL
For a school database, I would strongly choose a **SQL (relational) database** over NoSQL. The school's data is highly structured, strictly tabular, and relies entirely on predictable relationships between entities (students, courses, and the grades connecting them)[cite: 6]. SQL databases excel in environments where correctness and complex relationships are critical, utilizing foreign keys, `JOIN` queries, and `CASCADE` rules to enforce strict data integrity[cite: 6]. Conversely, NoSQL document databases are better suited for rapidly changing, flexible data shapes or large-scale catalogues[cite: 6], which do not align with the rigid, normalized needs of academic record-keeping.