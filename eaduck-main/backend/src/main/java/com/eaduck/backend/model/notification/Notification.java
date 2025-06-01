package com.eaduck.backend.model.notification;

import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.model.user.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(nullable = false)
    private String message;

    @Column(name = "notification_type")
    private String notificationType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}