package com.eaduck.backend.repository;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Set;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
    Set<Classroom> findByTeachersContaining(User teacher);
    Set<Classroom> findByStudentsContaining(User student);
    
    @Query("SELECT DISTINCT c FROM Classroom c LEFT JOIN FETCH c.students LEFT JOIN FETCH c.teachers WHERE c.isActive = true")
    List<Classroom> findAllActiveWithRelations();
    
    @Query("SELECT DISTINCT c FROM Classroom c LEFT JOIN FETCH c.students LEFT JOIN FETCH c.teachers WHERE :teacher MEMBER OF c.teachers")
    List<Classroom> findByTeacherWithRelations(@Param("teacher") User teacher);
}