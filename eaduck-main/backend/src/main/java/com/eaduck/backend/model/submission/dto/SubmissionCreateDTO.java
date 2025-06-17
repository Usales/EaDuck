package com.eaduck.backend.model.submission.dto;

import lombok.Data;

@Data
public class SubmissionCreateDTO {
    private Long taskId;
    private String content;
    // Para upload de arquivo, pode ser adicionado MultipartFile file no controller
} 