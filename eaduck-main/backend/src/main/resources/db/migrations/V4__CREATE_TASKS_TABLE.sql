CREATE TABLE tasks (
                       id BIGSERIAL PRIMARY KEY,
                       title VARCHAR(255) NOT NULL,
                       description TEXT,
                       due_date TIMESTAMP,
                       classroom_id BIGINT,
                       created_by BIGINT,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id);
ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE notifications
    ADD COLUMN task_id BIGINT,
    ADD COLUMN notification_type VARCHAR(50);

ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_task FOREIGN KEY (task_id) REFERENCES tasks(id);