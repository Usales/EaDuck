CREATE TABLE classroom_teachers (
                                    classroom_id BIGINT NOT NULL,
                                    teacher_id BIGINT NOT NULL,
                                    PRIMARY KEY (classroom_id, teacher_id),
                                    CONSTRAINT fk_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
                                    CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);