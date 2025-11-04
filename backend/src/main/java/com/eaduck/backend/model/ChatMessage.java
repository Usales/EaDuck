package com.eaduck.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

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
    private String id;
    
    // Campos de arquivo
    private String fileUrl;
    private String fileType;
    private String fileName;
    private Long fileSize;
    
    // Mensagem respondida
    private String repliedToMessageId;
    private ChatMessage repliedToMessage;
    
    // Reações e status
    private List<ReactionCount> reactions;
    private String status; // sent, delivered, viewed

    public enum MessageType {
        CHAT, JOIN, LEAVE, IMAGE, AUDIO
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReactionCount {
        private String emoji;
        private Long count;
        private List<String> userEmails; // Usuários que reagiram com este emoji
    }
}
