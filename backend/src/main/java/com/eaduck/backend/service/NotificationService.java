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
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

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
        try {
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
            
            // Tenta enviar o e-mail, mas não falha se não conseguir
            try {
        sendEmail(userId, message);
            } catch (Exception e) {
                logger.error("Erro ao enviar e-mail para usuário {}: {}", userId, e.getMessage());
            }
            
        return notification;
        } catch (Exception e) {
            logger.error("Erro ao criar notificação: {}", e.getMessage());
            throw new RuntimeException("Erro ao criar notificação: " + e.getMessage());
        }
    }

    public void notifyClassroom(Long classroomId, Long taskId, String message, String notificationType) {
        try {
        Optional<Classroom> classroomOpt = classroomRepository.findById(classroomId);
        if (classroomOpt.isPresent()) {
            Classroom classroom = classroomOpt.get();
            for (User student : classroom.getStudents()) {
                    try {
                createNotification(student.getId(), taskId, message, notificationType);
                    } catch (Exception e) {
                        logger.error("Erro ao notificar estudante {}: {}", student.getId(), e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Erro ao notificar turma {}: {}", classroomId, e.getMessage());
            throw new RuntimeException("Erro ao notificar turma: " + e.getMessage());
        }
    }

    public List<Notification> getNotificationsForUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (user.getRole().equals("ROLE_ADMIN")) {
            return notificationRepository.findAll();
        } else if (user.getRole().equals("ROLE_TEACHER")) {
            return notificationRepository.findByUser(user);
        } else {
            return notificationRepository.findByUser(user);
        }
    }

    private void sendEmail(Long userId, String message) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String userEmail = user.getEmail();
            if (userEmail != null && !userEmail.isEmpty()) {
                try {
                    Task task = null;
                    String title = "Notificação EaDuck";
                    String description = message;
                    String dueDate = "";
                    String classroomName = "";
                    String type = "NOTIFICACAO";
                    String typeLabel = "Notificação";
                    String iconUrl = "https://cdn-icons-png.flaticon.com/512/616/616408.png"; // Pato padrão
                    String iconAlt = "Pato de borracha";
                    String iconBg = "#6366f1";
                    if (message != null && message.contains("Nova tarefa:")) {
                        List<Task> tasks = taskRepository.findAll();
                        for (Task t : tasks) {
                            if (message.contains(t.getTitle())) {
                                task = t;
                                break;
                            }
                        }
                        if (task != null) {
                            title = task.getTitle();
                            description = task.getDescription();
                            dueDate = task.getDueDate() != null ? task.getDueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Sem prazo definido";
                            classroomName = task.getClassroom() != null ? task.getClassroom().getName() : "";
                            type = task.getType() != null ? task.getType().toUpperCase() : "TAREFA";
                        }
                    }
                    // Escolher animalzinho e cor pelo tipo
                    switch (type) {
                        case "TAREFA":
                            iconUrl = "https://cdn-icons-png.flaticon.com/512/616/616408.png"; // Pato
                            iconAlt = "Pato de borracha";
                            iconBg = "#6366f1";
                            typeLabel = "Tarefa";
                            break;
                        case "PROVA":
                            iconUrl = "https://cdn-icons-png.flaticon.com/512/616/616408.png"; // Cachorro cartoon
                            iconAlt = "Cachorro cartoon";
                            iconBg = "#f59e42";
                            typeLabel = "Prova";
                            break;
                        case "FORUM":
                            iconUrl = "https://cdn-icons-png.flaticon.com/512/616/616408.png"; // Gato cartoon
                            iconAlt = "Gato cartoon";
                            iconBg = "#22d3ee";
                            typeLabel = "Fórum";
                            break;
                        case "NOTIFICACAO":
                        default:
                            iconUrl = "https://cdn-icons-png.flaticon.com/512/616/616408.png"; // Coelho cartoon
                            iconAlt = "Coelho cartoon";
                            iconBg = "#f43f5e";
                            typeLabel = "Notificação";
                            break;
                    }
                    MimeMessage mimeMessage = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                    helper.setTo(userEmail);
                    helper.setSubject("[EaDuck] " + typeLabel + ": " + title);
                    String html = "" +
                        "<div style='background:#f4f6fb;padding:32px 0;font-family:sans-serif;'>" +
                        "  <div style='max-width:480px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 2px 8px #0001;padding:32px;text-align:center;'>" +
                        "    <div style='display:flex;align-items:center;justify-content:center;margin-bottom:16px;'>" +
                        "      <div style='background:" + iconBg + ";border-radius:50%;width:64px;height:64px;display:flex;align-items:center;justify-content:center;'>" +
                        "        <img src='" + iconUrl + "' alt='" + iconAlt + "' style='width:40px;height:40px;'/>" +
                        "      </div>" +
                        "    </div>" +
                        "    <span style='display:inline-block;background:" + iconBg + ";color:#fff;border-radius:8px;padding:4px 16px;font-size:14px;font-weight:bold;margin-bottom:8px;'>" + typeLabel + "</span>" +
                        "    <h2 style='color:#232b3e;margin-bottom:8px;'>" + title + "</h2>" +
                        (classroomName != null && !classroomName.isEmpty() ? "<div style='color:#888;font-size:15px;margin-bottom:8px;'>Turma: <b>" + classroomName + "</b></div>" : "") +
                        (description != null ? "<div style='color:#444;font-size:16px;margin-bottom:16px;'>" + description + "</div>" : "") +
                        (dueDate != null && !dueDate.isEmpty() ? "<div style='color:#232b3e;font-size:15px;margin-bottom:16px;'><b>Prazo:</b> " + dueDate + "</div>" : "") +
                        "    <a href='https://eaduck.com' style='display:inline-block;margin:16px 0 0 0;padding:12px 32px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;letter-spacing:1px;'>Acessar EaDuck</a>" +
                        "    <div style='margin-top:32px;color:#aaa;font-size:13px;'>Esta é uma notificação automática do sistema EaDuck.<br/>Por favor, não responda este e-mail.</div>" +
                        "  </div>" +
                        "</div>";
                    helper.setText(html, true);
                    helper.setFrom("compeaduck@gmail.com");
                    mailSender.send(mimeMessage);
                    logger.info("E-mail HTML enviado com sucesso para {}", userEmail);
                } catch (Exception ex) {
                    logger.error("Erro ao enviar e-mail HTML para usuário {}: {}", userEmail, ex.getMessage());
                }
            }
        }
    }
}