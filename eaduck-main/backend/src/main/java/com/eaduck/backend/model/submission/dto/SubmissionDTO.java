package com.eaduck.backend.model.submission.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SubmissionDTO {
    private Long id;
    private Long taskId;
    private Long studentId;
    private String content;
    private String fileUrl;
    private LocalDateTime submittedAt;
    private Double grade;
    private String feedback;
    private LocalDateTime evaluatedAt;
    private String studentName;
    private String studentEmail;
} 