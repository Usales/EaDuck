package com.eaduck.backend.repository;

import com.eaduck.backend.model.classroom.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
}