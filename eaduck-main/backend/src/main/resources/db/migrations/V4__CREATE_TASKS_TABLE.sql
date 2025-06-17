CREATE TABLE tasks (
                       id BIGSERIAL PRIMARY KEY,
                       title VARCHAR(255) NOT NULL,
                       description TEXT,
                       due_date TIMESTAMP,
                       classroom_id BIGINT,
                       created_by BIGINT,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       type VARCHAR(32) NOT NULL DEFAULT 'TAREFA'
);

ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id);
ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users(id);

-- Agora que tasks existe, podemos adicionar a constraint de notifications
ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;