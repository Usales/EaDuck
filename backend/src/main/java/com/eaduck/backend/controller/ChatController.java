package com.eaduck.backend.controller;

import com.eaduck.backend.model.ChatMessage;
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
    private final Map<String, OnlineUser> onlineUsers = new ConcurrentHashMap<>();

    public ChatController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
        chatMessage.setTimestamp(new Date());
        chatMessage.setMessage(chatMessage.getContent());
        chatMessage.setSenderName(chatMessage.getSender());
        
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

    private void broadcastUserCount() {
        Map<String, Object> userCountData = new HashMap<>();
        userCountData.put("count", onlineUsers.size());
        userCountData.put("users", new ArrayList<>(onlineUsers.values()));
        
        messagingTemplate.convertAndSend("/topic/userCount", userCountData);
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
