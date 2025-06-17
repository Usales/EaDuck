package com.eaduck.backend.model.task.dto;

import java.time.LocalDateTime;

public class TaskSimpleDTO {
    private Long id;
    private String title;
    private String description;
    private LocalDateTime dueDate;
    private String type;
    private Long classroomId;
    private String classroomName;

    public TaskSimpleDTO(Long id, String title, String description, LocalDateTime dueDate, String type, Long classroomId, String classroomName) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
        this.type = type;
        this.classroomId = classroomId;
        this.classroomName = classroomName;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalDateTime getDueDate() { return dueDate; }
    public String getType() { return type; }
    public Long getClassroomId() { return classroomId; }
    public String getClassroomName() { return classroomName; }

    public void setId(Long id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }
    public void setType(String type) { this.type = type; }
    public void setClassroomId(Long classroomId) { this.classroomId = classroomId; }
    public void setClassroomName(String classroomName) { this.classroomName = classroomName; }
} 