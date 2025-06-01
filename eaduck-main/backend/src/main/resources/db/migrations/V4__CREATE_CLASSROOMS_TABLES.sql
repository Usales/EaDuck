-- V4__CREATE_CLASSROOMS_TABLES.sql
CREATE TABLE classrooms (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    academic_year VARCHAR(10),
    teacher_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classroom_students (
    classroom_id BIGINT REFERENCES classrooms(id),
    student_id BIGINT REFERENCES users(id),
    PRIMARY KEY (classroom_id, student_id)
);