package com.eaduck.backend.repository;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Set;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
    Set<Classroom> findByTeachersContaining(User teacher);
    Set<Classroom> findByStudentsContaining(User student);
}