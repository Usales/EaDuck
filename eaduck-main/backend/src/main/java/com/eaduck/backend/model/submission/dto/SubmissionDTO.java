package com.eaduck.backend.model.submission.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionDTO {
    private Long id;
    private Long taskId;
    private String taskTitle;
    private Long studentId;
    private String studentEmail;
    private String content;
    private LocalDateTime submittedAt;
} 