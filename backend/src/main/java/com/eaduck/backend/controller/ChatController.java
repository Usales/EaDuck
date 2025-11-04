package com.eaduck.backend.controller;

import com.eaduck.backend.model.ChatMessage;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final Map<String, OnlineUser> onlineUsers = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> typingUsers = new ConcurrentHashMap<>(); // classroomId -> Set of user emails

    public ChatController(SimpMessagingTemplate messagingTemplate, ChatMessageService chatMessageService, UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.chatMessageService = chatMessageService;
        this.userRepository = userRepository;
    }

    private String getUserRole(String email) {
        return userRepository.findByEmail(email)
                .map(user -> user.getRole().name())
                .orElse("STUDENT");
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
        // Manter o senderName que já foi enviado pelo frontend
        // Usar o role enviado pelo frontend se disponível, caso contrário buscar no banco
        if (chatMessage.getSenderRole() == null || chatMessage.getSenderRole().isEmpty()) {
            chatMessage.setSenderRole(getUserRole(chatMessage.getSender()));
        } else {
            // Validar que o role do frontend corresponde ao role do banco
            String roleFromDb = getUserRole(chatMessage.getSender());
            if (!roleFromDb.equals(chatMessage.getSenderRole())) {
                System.out.println("ATENÇÃO: Role do frontend (" + chatMessage.getSenderRole() + 
                    ") não corresponde ao role do banco (" + roleFromDb + "). Usando role do banco.");
                chatMessage.setSenderRole(roleFromDb);
            }
        }
        
        // Salvar mensagem no banco de dados
        try {
            com.eaduck.backend.model.ChatMessageEntity savedEntity = chatMessageService.saveMessage(chatMessage);
            chatMessage.setId(savedEntity.getId().toString());
            
            // Carregar reações e informações completas
            chatMessage.setReactions(chatMessageService.getReactionsByMessageId(savedEntity.getId()));
            chatMessage.setStatus("delivered");
            
            System.out.println("Mensagem salva no banco de dados");
        } catch (Exception e) {
            System.err.println("Erro ao salvar mensagem: " + e.getMessage());
            chatMessage.setStatus("failed");
        }
        
        // Remover usuário da lista de digitação
        stopTyping(chatMessage.getSender(), null);
        
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
        // Manter o senderName que já foi enviado pelo frontend
        chatMessage.setSenderRole(getUserRole(chatMessage.getSender()));
        
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
        System.out.println("Role enviado pelo frontend: " + chatMessage.getSenderRole());
        
        chatMessage.setTimestamp(new Date());
        chatMessage.setMessage(chatMessage.getContent());
        // Manter o senderName que já foi enviado pelo frontend
        // Usar o role enviado pelo frontend se disponível, caso contrário buscar no banco
        if (chatMessage.getSenderRole() == null || chatMessage.getSenderRole().isEmpty()) {
            String roleFromDb = getUserRole(chatMessage.getSender());
            System.out.println("Role não encontrado no frontend, buscando no banco: " + roleFromDb);
            chatMessage.setSenderRole(roleFromDb);
        } else {
            System.out.println("Usando role do frontend: " + chatMessage.getSenderRole());
            // Validar que o role do frontend corresponde ao role do banco
            String roleFromDb = getUserRole(chatMessage.getSender());
            if (!roleFromDb.equals(chatMessage.getSenderRole())) {
                System.out.println("ATENÇÃO: Role do frontend (" + chatMessage.getSenderRole() + 
                    ") não corresponde ao role do banco (" + roleFromDb + "). Usando role do banco.");
                chatMessage.setSenderRole(roleFromDb);
            }
        }
        
        // Salvar mensagem no banco de dados
        try {
            com.eaduck.backend.model.ChatMessageEntity savedEntity = chatMessageService.saveMessage(chatMessage);
            chatMessage.setId(savedEntity.getId().toString());
            
            // Carregar reações e informações completas
            chatMessage.setReactions(chatMessageService.getReactionsByMessageId(savedEntity.getId()));
            chatMessage.setStatus("delivered");
            
            System.out.println("Mensagem da sala salva no banco de dados");
        } catch (Exception e) {
            System.err.println("Erro ao salvar mensagem da sala: " + e.getMessage());
            chatMessage.setStatus("failed");
        }
        
        // Remover usuário da lista de digitação
        stopTyping(chatMessage.getSender(), chatMessage.getClassroomId());
        
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
        // Manter o senderName que já foi enviado pelo frontend
        chatMessage.setSenderRole(getUserRole(chatMessage.getSender()));
        
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
    
    @MessageMapping("/chat.typing")
    public void handleTyping(@Payload Map<String, String> payload) {
        String userEmail = payload.get("sender");
        String senderName = payload.get("senderName");
        String classroomId = payload.get("classroomId");
        
        String key = classroomId != null ? classroomId : "public";
        typingUsers.computeIfAbsent(key, k -> ConcurrentHashMap.newKeySet()).add(userEmail);
        
        Map<String, Object> typingData = new HashMap<>();
        typingData.put("userEmail", userEmail);
        typingData.put("senderName", senderName);
        typingData.put("typing", true);
        typingData.put("classroomId", classroomId);
        
        String topic = classroomId != null ? "/topic/typing.room." + classroomId : "/topic/typing.public";
        messagingTemplate.convertAndSend(topic, typingData);
    }
    
    @MessageMapping("/chat.stopTyping")
    public void handleStopTyping(@Payload Map<String, String> payload) {
        String userEmail = payload.get("sender");
        String classroomId = payload.get("classroomId");
        
        stopTyping(userEmail, classroomId);
    }
    
    private void stopTyping(String userEmail, String classroomId) {
        String key = classroomId != null ? classroomId : "public";
        Set<String> users = typingUsers.get(key);
        if (users != null) {
            users.remove(userEmail);
            
            Map<String, Object> typingData = new HashMap<>();
            typingData.put("userEmail", userEmail);
            typingData.put("typing", false);
            typingData.put("classroomId", classroomId);
            
            String topic = classroomId != null ? "/topic/typing.room." + classroomId : "/topic/typing.public";
            messagingTemplate.convertAndSend(topic, typingData);
        }
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
