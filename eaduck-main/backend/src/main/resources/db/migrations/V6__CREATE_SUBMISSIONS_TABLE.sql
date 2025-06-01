-- V6__CREATE_SUBMISSIONS_TABLE.sql
CREATE TABLE submissions (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT REFERENCES tasks(id),
    student_id BIGINT REFERENCES users(id),
    content TEXT,
    file_url VARCHAR(255),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);