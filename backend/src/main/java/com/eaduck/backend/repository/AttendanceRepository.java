package com.eaduck.backend.repository;

import com.eaduck.backend.model.attendance.Attendance;
import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    Optional<Attendance> findByClassroomAndStudentAndDate(Classroom classroom, User student, LocalDate date);
    
    List<Attendance> findByClassroomAndDate(Classroom classroom, LocalDate date);
    
    List<Attendance> findByClassroom(Classroom classroom);
    
    List<Attendance> findByClassroomAndDateBetween(Classroom classroom, LocalDate startDate, LocalDate endDate);
    
    List<Attendance> findByStudent(User student);
    
    List<Attendance> findByClassroomAndStudent(Classroom classroom, User student);
}

