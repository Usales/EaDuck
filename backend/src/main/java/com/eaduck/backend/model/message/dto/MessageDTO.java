package com.eaduck.backend.model.message.dto;

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
public class MessageDTO {
    private Long id;
    private UserDTO sender;
    private UserDTO receiver;
    private String content;
    private LocalDateTime sentAt;
} 