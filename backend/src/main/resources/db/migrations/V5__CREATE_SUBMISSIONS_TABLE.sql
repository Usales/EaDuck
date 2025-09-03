CREATE TABLE submissions (
                             id BIGSERIAL PRIMARY KEY,
                             task_id BIGINT,
                             student_id BIGINT,
                             content TEXT,
                             file_url VARCHAR(255),
                             submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE submissions
    ADD CONSTRAINT fk_submissions_task FOREIGN KEY (task_id) REFERENCES tasks(id);
ALTER TABLE submissions
    ADD CONSTRAINT fk_submissions_student FOREIGN KEY (student_id) REFERENCES users(id);