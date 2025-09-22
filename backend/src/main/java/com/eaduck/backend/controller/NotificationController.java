package com.eaduck.backend.controller;

import com.eaduck.backend.model.notification.dto.NotificationDTO;
import com.eaduck.backend.model.notification.Notification;
import com.eaduck.backend.service.NotificationService;
import com.eaduck.backend.repository.NotificationRepository;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.repository.ClassroomRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private static final Logger logger = LoggerFactory.getLogger(NotificationController.class);

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClassroomRepository classroomRepository;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> createNotification(@RequestBody NotificationDTO dto) {
        if (dto.getClassroomId() != null) {
            // Envio em massa para turma
            Classroom classroom = classroomRepository.findById(dto.getClassroomId()).orElse(null);
            if (classroom == null || classroom.getStudents() == null) {
                return ResponseEntity.badRequest().body("Turma não encontrada ou sem alunos.");
            }
            for (User student : classroom.getStudents()) {
                Notification notification = Notification.builder()
                        .user(student)
                        .message(dto.getMessage())
                        .notificationType(dto.getNotificationType())
                        .createdAt(LocalDateTime.now())
                        .title(dto.getTitle())
                        .isRead(false)
                        .build();
                notificationRepository.save(notification);
            }
            return ResponseEntity.ok().build();
        } else if (dto.getUserId() != null) {
            // Envio para usuário único
            User user = userRepository.findById(dto.getUserId()).orElse(null);
            if (user == null) {
                return ResponseEntity.badRequest().body("Usuário não encontrado.");
            }
            Notification notification = Notification.builder()
                    .user(user)
                    .message(dto.getMessage())
                    .notificationType(dto.getNotificationType())
                    .createdAt(LocalDateTime.now())
                    .title(dto.getTitle())
                    .isRead(false)
                    .build();
            notificationRepository.save(notification);
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.badRequest().body("Destinatário não informado.");
        }
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getNotificationsByUser(@PathVariable Long userId, Authentication authentication) {
        try {
            // Verifica se o usuário existe
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            // Verifica se o usuário autenticado tem permissão
            Optional<User> authenticatedUserOpt = userRepository.findByEmail(authentication.getName());
            if (authenticatedUserOpt.isEmpty()) {
                return ResponseEntity.status(403).body("Usuário não encontrado");
            }

            User authenticatedUser = authenticatedUserOpt.get();
            User targetUser = userOpt.get();

            // Verifica permissões
            boolean hasPermission = false;
            if (authenticatedUser.getRole().name().equals("ROLE_ADMIN")) {
                hasPermission = true;
            } else if (authenticatedUser.getRole().name().equals("ROLE_TEACHER")) {
                hasPermission = authenticatedUser.getId().equals(userId);
            } else {
                hasPermission = authenticatedUser.getId().equals(userId);
            }

            if (!hasPermission) {
                return ResponseEntity.status(403).body("Acesso negado");
            }

            List<Notification> notifications = notificationRepository.findByUserId(userId);
            List<NotificationDTO> dtos = notifications.stream().map(this::toDTO).toList();
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            logger.error("Erro ao buscar notificações: {}", e.getMessage());
            return ResponseEntity.status(500).body("Erro ao buscar notificações: " + e.getMessage());
        }
    }

    private NotificationDTO toDTO(Notification n) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(n.getId());
        if (n.getUser() != null) {
            dto.setUserId(n.getUser().getId());
        }
        dto.setMessage(n.getMessage());
        dto.setNotificationType(n.getNotificationType());
        dto.setCreatedAt(n.getCreatedAt());
        dto.setRead(n.isRead());
        dto.setTitle(n.getTitle());
        if (n.getTask() != null && n.getTask().getClassroom() != null) {
            dto.setClassroomId(n.getTask().getClassroom().getId());
        }
        return dto;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NotificationDTO>> getAllNotifications(Authentication authentication) {
        try {
            logger.info("Buscando notificações para usuário: {}", authentication.getName());
            
            // Get current user
            Optional<User> userOpt = userRepository.findByEmail(authentication.getName());
            if (userOpt.isEmpty()) {
                logger.warn("Usuário não encontrado: {}", authentication.getName());
                return ResponseEntity.status(403).body(java.util.Collections.emptyList());
            }
            
            User currentUser = userOpt.get();
            logger.info("Usuário encontrado: {} com role: {}", currentUser.getEmail(), currentUser.getRole());
            
            List<Notification> notifications;
            
            // If user is ADMIN or TEACHER, return all notifications
            if (currentUser.getRole().name().equals("ROLE_ADMIN") || currentUser.getRole().name().equals("ROLE_TEACHER")) {
                logger.info("Buscando todas as notificações para ADMIN/TEACHER");
                notifications = notificationRepository.findAll();
            } else {
                // If user is STUDENT, return only their notifications
                logger.info("Buscando notificações para estudante ID: {}", currentUser.getId());
                notifications = notificationRepository.findByUserId(currentUser.getId());
            }
            
            logger.info("Encontradas {} notificações", notifications.size());
            
            // Convert to DTOs
            List<NotificationDTO> dtos = notifications.stream().map(this::toDTO).toList();
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            logger.error("Erro ao buscar notificações: {}", e.getMessage(), e);
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
    }

    @Transactional
    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        return notificationRepository.findById(id)
                .map(notification -> {
                    notification.setRead(true);
                    notificationRepository.save(notification);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}