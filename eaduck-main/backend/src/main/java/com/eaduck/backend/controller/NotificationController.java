package com.eaduck.backend.controller;

import com.eaduck.backend.model.notification.dto.NotificationDTO;
import com.eaduck.backend.model.notification.Notification;
import com.eaduck.backend.service.NotificationService;
import com.eaduck.backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<Notification> createNotification(@RequestBody Notification notification) {
        notification.setId(null);
        notification.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.ok(notificationRepository.save(notification));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER') or #userId == authentication.name")
    public ResponseEntity<List<Notification>> getNotificationsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(notificationRepository.findByUserId(userId));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<List<Notification>> getAllNotifications() {
        return ResponseEntity.ok(notificationRepository.findAll());
    }
}