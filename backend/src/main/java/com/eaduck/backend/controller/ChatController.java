package com.eaduck.backend.controller;

import com.eaduck.backend.model.ChatMessage;
import com.eaduck.backend.service.ChatMessageService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageService chatMessageService;
    private final Map<String, OnlineUser> onlineUsers = new ConcurrentHashMap<>();

    public ChatController(SimpMessagingTemplate messagingTemplate, ChatMessageService chatMessageService) {
        this.messagingTemplate = messagingTemplate;
        this.chatMessageService = chatMessageService;
    }

    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
        System.out.println("=== MENSAGEM RECEBIDA NO CHAT GERAL ===");
        System.out.println("Tipo: " + chatMessage.getType());
        System.out.println("Conteúdo: " + chatMessage.getContent());
        System.out.println("Remetente: " + chatMessage.getSender());
        System.out.println("Nome do remetente: " + chatMessage.getSenderName());
        
        chatMessage.setTimestamp(new Date());
        chatMessage.setMessage(chatMessage.getContent());
        chatMessage.setSenderName(chatMessage.getSender());
        
        // Salvar mensagem no banco de dados
        try {
            chatMessageService.saveMessage(chatMessage);
            System.out.println("Mensagem salva no banco de dados");
        } catch (Exception e) {
            System.err.println("Erro ao salvar mensagem: " + e.getMessage());
        }
        
        System.out.println("Mensagem processada e enviando para /topic/public");
        
        // Broadcast user count update
        broadcastUserCount();
        
        return chatMessage;
    }

    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public ChatMessage addUser(@Payload ChatMessage chatMessage,
                               SimpMessageHeaderAccessor headerAccessor) {
        // Add username in web socket session
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes != null) {
            sessionAttributes.put("username", chatMessage.getSender());
        }
        chatMessage.setTimestamp(new Date());
        chatMessage.setMessage(chatMessage.getContent());
        chatMessage.setSenderName(chatMessage.getSender());
        
        // Add user to online list
        if (chatMessage.getType() == ChatMessage.MessageType.JOIN) {
            OnlineUser user = new OnlineUser();
            user.setId(chatMessage.getSender());
            user.setName(chatMessage.getSenderName());
            user.setEmail(chatMessage.getSender());
            user.setLastSeen(new Date());
            onlineUsers.put(chatMessage.getSender(), user);
        } else if (chatMessage.getType() == ChatMessage.MessageType.LEAVE) {
            onlineUsers.remove(chatMessage.getSender());
        }
        
        // Broadcast user count update
        broadcastUserCount();
        
        return chatMessage;
    }

    @MessageMapping("/chat.sendMessage.room")
    public ChatMessage sendMessageToRoom(@Payload ChatMessage chatMessage) {
        System.out.println("=== MENSAGEM RECEBIDA NA SALA ===");
        System.out.println("Tipo: " + chatMessage.getType());
        System.out.println("Conteúdo: " + chatMessage.getContent());
        System.out.println("Remetente: " + chatMessage.getSender());
        System.out.println("Nome do remetente: " + chatMessage.getSenderName());
        System.out.println("ID da Sala: " + chatMessage.getClassroomId());
        
        chatMessage.setTimestamp(new Date());
        chatMessage.setMessage(chatMessage.getContent());
        chatMessage.setSenderName(chatMessage.getSender());
        
        // Salvar mensagem no banco de dados
        try {
            chatMessageService.saveMessage(chatMessage);
            System.out.println("Mensagem da sala salva no banco de dados");
        } catch (Exception e) {
            System.err.println("Erro ao salvar mensagem da sala: " + e.getMessage());
        }
        
        System.out.println("Mensagem processada e enviando para /topic/room." + chatMessage.getClassroomId());
        
        // Enviar mensagem para o tópico da sala
        messagingTemplate.convertAndSend("/topic/room." + chatMessage.getClassroomId(), chatMessage);
        
        // Broadcast user count update for the room
        broadcastRoomUserCount(chatMessage.getClassroomId());
        
        return chatMessage;
    }

    @MessageMapping("/chat.addUser.room")
    public ChatMessage addUserToRoom(@Payload ChatMessage chatMessage,
                                   SimpMessageHeaderAccessor headerAccessor) {
        // Add username in web socket session
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes != null) {
            sessionAttributes.put("username", chatMessage.getSender());
            sessionAttributes.put("classroomId", chatMessage.getClassroomId());
        }
        chatMessage.setTimestamp(new Date());
        chatMessage.setMessage(chatMessage.getContent());
        chatMessage.setSenderName(chatMessage.getSender());
        
        // Add user to online list for the room
        String roomKey = chatMessage.getClassroomId() + "_" + chatMessage.getSender();
        if (chatMessage.getType() == ChatMessage.MessageType.JOIN) {
            OnlineUser user = new OnlineUser();
            user.setId(chatMessage.getSender());
            user.setName(chatMessage.getSenderName());
            user.setEmail(chatMessage.getSender());
            user.setLastSeen(new Date());
            onlineUsers.put(roomKey, user);
        } else if (chatMessage.getType() == ChatMessage.MessageType.LEAVE) {
            onlineUsers.remove(roomKey);
        }
        
        // Enviar mensagem para o tópico da sala
        messagingTemplate.convertAndSend("/topic/room." + chatMessage.getClassroomId(), chatMessage);
        
        // Broadcast user count update for the room
        broadcastRoomUserCount(chatMessage.getClassroomId());
        
        return chatMessage;
    }

    private void broadcastUserCount() {
        Map<String, Object> userCountData = new HashMap<>();
        userCountData.put("count", onlineUsers.size());
        userCountData.put("users", new ArrayList<>(onlineUsers.values()));
        
        messagingTemplate.convertAndSend("/topic/userCount", userCountData);
    }

    private void broadcastRoomUserCount(String classroomId) {
        Map<String, Object> userCountData = new HashMap<>();
        long roomUserCount = onlineUsers.keySet().stream()
            .filter(key -> key.startsWith(classroomId + "_"))
            .count();
        userCountData.put("count", roomUserCount);
        userCountData.put("classroomId", classroomId);
        
        messagingTemplate.convertAndSend("/topic/room." + classroomId + ".userCount", userCountData);
    }

    // Inner class for online user tracking
    public static class OnlineUser {
        private String id;
        private String name;
        private String email;
        private Date lastSeen;

        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        
        public Date getLastSeen() { return lastSeen; }
        public void setLastSeen(Date lastSeen) { this.lastSeen = lastSeen; }
    }
}
