package com.eaduck.backend.model.message.dto;

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
    private Long senderId;
    private String senderEmail;
    private Long receiverId;
    private String receiverEmail;
    private String content;
    private LocalDateTime sentAt;
} 