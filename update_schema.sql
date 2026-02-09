-- Update Quizzes Table
alter table quizzes add column type text default 'Quiz'; -- 'Quiz' or 'Exam'

-- Update Attempts Table
alter table attempts add column student_email text;
