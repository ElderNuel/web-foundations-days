-- Enable foreign key support in SQLite
PRAGMA foreign_keys = ON;

-- =====================================
-- 1. CREATE TABLE STATEMENTS
-- =====================================

CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE enrolments (
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade TEXT,
  -- A composite primary key prevents a student from enrolling in the same course twice
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- =====================================
-- 2. INSERT STATEMENTS
-- =====================================

INSERT INTO students (name, email) VALUES 
  ('Amina Otieno', 'amina@example.com'),
  ('Brian Kamau', 'brian@example.com'),
  ('Chinedu Eze', 'chinedu@example.com'),
  ('Grace Njoroge', 'grace@example.com'); -- Student with no enrolments

INSERT INTO courses (title) VALUES 
  ('Web Foundations'),
  ('Python Programming'),
  ('Data Analytics with AI');

INSERT INTO enrolments (student_id, course_id, grade) VALUES 
  (1, 1, 'A'),
  (1, 2, 'B'),
  (2, 1, 'A-'),
  (2, 3, 'B+'),
  (3, 2, 'A');

-- =====================================
-- 3. QUERIES
-- =====================================

-- Query 1: All courses for one student (by name)
SELECT courses.title, enrolments.grade 
FROM courses 
JOIN enrolments ON courses.id = enrolments.course_id 
JOIN students ON enrolments.student_id = students.id 
WHERE students.name = 'Amina Otieno';

-- Query 2: All students on one course
SELECT students.name, students.email 
FROM students 
JOIN enrolments ON students.id = enrolments.student_id 
JOIN courses ON enrolments.course_id = courses.id 
WHERE courses.title = 'Web Foundations';

-- Query 3: The number of students per course
SELECT courses.title, COUNT(enrolments.student_id) AS student_count 
FROM courses 
LEFT JOIN enrolments ON courses.id = enrolments.course_id 
GROUP BY courses.id;

-- Query 4: Students who have no enrolments
SELECT students.name, students.email
FROM students 
LEFT JOIN enrolments ON students.id = enrolments.student_id 
WHERE enrolments.course_id IS NULL;

-- Query 5: Update of one enrolment's grade
UPDATE enrolments 
SET grade = 'A+' 
WHERE student_id = 2 AND course_id = 3;