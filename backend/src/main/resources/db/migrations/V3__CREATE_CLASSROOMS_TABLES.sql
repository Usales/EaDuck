CREATE TABLE classrooms (
                            id BIGSERIAL PRIMARY KEY,
                            name VARCHAR(100) NOT NULL,
                            academic_year VARCHAR(10),
                            teacher_id BIGINT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classroom_students (
                                    classroom_id BIGINT,
                                    student_id BIGINT,
                                    PRIMARY KEY (classroom_id, student_id)
);

ALTER TABLE classrooms
    ADD CONSTRAINT fk_classrooms_teacher FOREIGN KEY (teacher_id) REFERENCES users(id);

ALTER TABLE classroom_students
    ADD CONSTRAINT fk_classroom_students_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id);
ALTER TABLE classroom_students
    ADD CONSTRAINT fk_classroom_students_student FOREIGN KEY (student_id) REFERENCES users(id);