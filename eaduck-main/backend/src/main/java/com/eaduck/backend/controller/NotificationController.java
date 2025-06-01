package com.eaduck.backend.controller;

import com.eaduck.backend.model.notification.dto.NotificationDTO;
import com.eaduck.backend.model.notification.Notification;
import com.eaduck.backend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @PostMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<Notification> createNotification(@RequestBody NotificationDTO dto) {
        Notification notification = notificationService.createNotification(
                dto.getUserId(),
                dto.getTaskId(),
                dto.getMessage(),
                dto.getNotificationType()
        );
        return ResponseEntity.ok(notification);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<List<Notification>> getNotificationsByUser(@PathVariable Long userId) {
        List<Notification> notifications = notificationService.getNotificationsByUser(userId);
        return ResponseEntity.ok(notifications);
    }
}