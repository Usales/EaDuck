package com.eaduck.backend.repository;

import com.eaduck.backend.model.notification.Notification;
import com.eaduck.backend.model.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId")
    List<Notification> findByUserId(@Param("userId") Long userId);
    
    List<Notification> findByUser(User user);
}