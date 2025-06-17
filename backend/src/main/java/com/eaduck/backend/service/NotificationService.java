package com.eaduck.backend.service;

import com.eaduck.backend.model.notification.Notification;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.repository.NotificationRepository;
import com.eaduck.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    public List<Notification> getNotificationsForUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (user.getRole().equals("ROLE_ADMIN")) {
            return notificationRepository.findAll();
        } else if (user.getRole().equals("ROLE_TEACHER")) {
            Set<Classroom> teacherClassrooms = user.getTeacherClassrooms();
            return notificationRepository.findByUserOrClassroomIn(user, teacherClassrooms);
        } else {
            return notificationRepository.findByUser(user);
        }
    }

    public Notification createNotification(Notification notification) {
        return notificationRepository.save(notification);
    }

    public List<Notification> getNotificationsByUserId(Long userId) {
        return notificationRepository.findByUserId(userId);
    }
} 