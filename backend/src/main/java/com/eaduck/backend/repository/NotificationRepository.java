package com.eaduck.backend.repository;

import com.eaduck.backend.model.notification.Notification;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.model.classroom.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserId(Long userId);
    List<Notification> findByUser(User user);

    @Query("SELECT n FROM Notification n WHERE n.user = :user OR n.classroom IN :classrooms")
    List<Notification> findByUserOrClassroomIn(@Param("user") User user, @Param("classrooms") Set<Classroom> classrooms);
} 