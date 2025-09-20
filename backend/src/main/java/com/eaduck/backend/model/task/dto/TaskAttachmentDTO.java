package com.eaduck.backend.model.task.dto;

public record TaskAttachmentDTO(
    Long id,
    String fileName,
    Long fileSize,
    String fileType,
    String fileUrl,
    String uploadedAt
) {}