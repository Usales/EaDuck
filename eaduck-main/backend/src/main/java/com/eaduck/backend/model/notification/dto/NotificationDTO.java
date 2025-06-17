package com.eaduck.backend.model.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private Long id;
    private Long userId;
    private String message;
    private String notificationType;
    private LocalDateTime createdAt;
    private String title;
    private boolean isRead;
    private Long classroomId;
}
