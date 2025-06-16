package com.eaduck.backend.model.submission.dto;

import com.eaduck.backend.model.user.dto.UserDTO;
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
    private UserDTO student;
    private String content;
    private LocalDateTime submittedAt;
} 