package com.eaduck.backend.service;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.notification.Notification;
import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.ClassroomRepository;
import com.eaduck.backend.repository.NotificationRepository;
import com.eaduck.backend.repository.TaskRepository;
import com.eaduck.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private JavaMailSender mailSender;

    public Notification createNotification(Long userId, Long taskId, String message, String notificationType) {
        Optional<User> userOpt = userRepository.findById(userId);
        Optional<Task> taskOpt = taskId != null ? taskRepository.findById(taskId) : Optional.empty();

        if (!userOpt.isPresent()) {
            throw new RuntimeException("Usuário não encontrado.");
        }

        Notification notification = Notification.builder()
                .user(userOpt.get())
                .task(taskOpt.orElse(null))
                .message(message)
                .notificationType(notificationType)
                .createdAt(LocalDateTime.now())
                .build();

        notification = notificationRepository.save(notification);
        sendEmail(userId, message);
        return notification;
    }

    public void notifyClassroom(Long classroomId, Long taskId, String message, String notificationType) {
        Optional<Classroom> classroomOpt = classroomRepository.findById(classroomId);
        if (classroomOpt.isPresent()) {
            Classroom classroom = classroomOpt.get();
            for (User student : classroom.getStudents()) {
                createNotification(student.getId(), taskId, message, notificationType);
            }
        }
    }

    public List<Notification> getNotificationsByUser(Long userId) {
        return notificationRepository.findByUserId(userId);
    }

    private void sendEmail(Long userId, String message) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String userEmail = user.getEmail();
            if (userEmail != null && !userEmail.isEmpty()) {
                SimpleMailMessage mailMessage = new SimpleMailMessage();
                mailMessage.setTo(userEmail);
                mailMessage.setSubject("Nova Notificação - EaDuck");
                mailMessage.setText(message);
                mailMessage.setFrom("compeaduck@gmail.com");
                try {
                    mailSender.send(mailMessage);
                } catch (Exception e) {
                    System.err.println("Erro ao enviar e-mail para " + userEmail + ": " + e.getMessage());
                }
            }
        }
    }
}