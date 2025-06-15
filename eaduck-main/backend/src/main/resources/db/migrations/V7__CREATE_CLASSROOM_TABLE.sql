CREATE TABLE classroom (
                           id BIGSERIAL PRIMARY KEY,
                           name VARCHAR(255) NOT NULL,
                           academic_year VARCHAR(255),
                           teacher_id BIGINT,
                           created_at TIMESTAMP NOT NULL,
                           CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS classroom_students (
                                                  classroom_id BIGINT NOT NULL,
                                                  student_id BIGINT NOT NULL,
                                                  PRIMARY KEY (classroom_id, student_id),
    CONSTRAINT fk_classroom FOREIGN KEY (classroom_id) REFERENCES classroom(id),
    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES users(id)
    );