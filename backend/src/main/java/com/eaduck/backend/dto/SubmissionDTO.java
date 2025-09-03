package com.eaduck.backend.dto;

import java.time.LocalDateTime;

public record SubmissionDTO(
    Long id,
    Long taskId,
    Long studentId,
    String fileName,
    String fileType,
    Long fileSize,
    LocalDateTime submissionDate,
    Double grade,
    String feedback
) {} 