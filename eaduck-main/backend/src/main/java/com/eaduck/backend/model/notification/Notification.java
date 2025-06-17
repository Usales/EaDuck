package com.eaduck.backend.model.notification;

import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.model.user.User;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"password", "role", "classrooms", "tasks", "submissions"})
    private User user;

    @ManyToOne
    @JoinColumn(name = "task_id")
    @JsonIgnoreProperties({"classroom", "submissions", "createdBy"})
    private Task task;

    @Column(nullable = false)
    private String message;

    @Column(name = "notification_type")
    private String notificationType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "title")
    private String title;

    @Column(name = "is_read", nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("isRead")
    private boolean isRead = false;

    public boolean isRead() {
        return isRead;
    }

    public void setRead(boolean read) {
        isRead = read;
    }
}