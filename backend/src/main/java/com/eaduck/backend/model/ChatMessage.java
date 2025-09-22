package com.eaduck.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    private MessageType type;
    private String content;
    private String sender;
    private String senderName;
    private String senderRole;
    private String message;
    private boolean isMine;
    private Date timestamp;
    private String classroomId;

    public enum MessageType {
        CHAT, JOIN, LEAVE
    }
}
