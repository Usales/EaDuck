package com.eaduck.backend.model.notification.dto;

public class NotificationDTO {

    private Long userId;
    private Long taskId;
    private String message;
    private String notificationType;

    // Construtor vazio
    public NotificationDTO() {
    }

    // Construtor com campos
    public NotificationDTO(Long userId, Long taskId, String message, String notificationType) {
        this.userId = userId;
        this.taskId = taskId;
        this.message = message;
        this.notificationType = notificationType;
    }

    // Getters e Setters
    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getTaskId() {
        return taskId;
    }

    public void setTaskId(Long taskId) {
        this.taskId = taskId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getNotificationType() {
        return notificationType;
    }

    public void setNotificationType(String notificationType) {
        this.notificationType = notificationType;
    }
}
