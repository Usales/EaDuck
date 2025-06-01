package com.eaduck.backend.model.task.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TaskDTO {
    private String title;
    private String description;
    private LocalDateTime dueDate;
    private Long classroomId;
}