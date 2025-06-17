package com.eaduck.backend.model.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDTO {
    private Long id;
    private String title;
    private String description;
    private LocalDateTime dueDate;
    private Long classroomId;
    private String classroomName;
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private String type;
}