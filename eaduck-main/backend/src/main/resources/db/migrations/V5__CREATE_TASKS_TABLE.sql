-- V5__CREATE_TASKS_TABLE.sql
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    classroom_id BIGINT REFERENCES classrooms(id),
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE notifications
    ADD COLUMN task_id BIGINT REFERENCES tasks(id),
    ADD COLUMN notification_type VARCHAR(50);