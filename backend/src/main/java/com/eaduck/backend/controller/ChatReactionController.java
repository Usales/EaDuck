package com.eaduck.backend.controller;

import com.eaduck.backend.model.ChatMessage;
import com.eaduck.backend.service.ChatMessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatReactionController {

    private final ChatMessageService chatMessageService;

    public ChatReactionController(ChatMessageService chatMessageService) {
        this.chatMessageService = chatMessageService;
    }

    @PostMapping("/message/{messageId}/reaction")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> toggleReaction(
            @PathVariable Long messageId,
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        
        String userEmail = authentication.getName();
        String emoji = request.get("emoji");
        
        if (emoji == null || emoji.isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Emoji é obrigatório");
            return ResponseEntity.badRequest().body(response);
        }
        
        boolean added = chatMessageService.toggleReaction(messageId, userEmail, emoji);
        
        Map<String, Object> response = new HashMap<>();
        response.put("added", added);
        response.put("messageId", messageId);
        response.put("emoji", emoji);
        response.put("userEmail", userEmail);
        response.put("reactions", chatMessageService.getReactionsByMessageId(messageId));
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/message/{messageId}/reactions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChatMessage.ReactionCount>> getReactions(@PathVariable Long messageId) {
        List<ChatMessage.ReactionCount> reactions = chatMessageService.getReactionsByMessageId(messageId);
        return ResponseEntity.ok(reactions);
    }

    @PostMapping("/messages/viewed")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> markMessagesAsViewed(
            @RequestBody Map<String, Object> request,
            Authentication authentication) {
        
        String userEmail = authentication.getName();
        
        @SuppressWarnings("unchecked")
        List<Integer> messageIdsInt = (List<Integer>) request.get("messageIds");
        
        if (messageIdsInt == null || messageIdsInt.isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Lista de IDs de mensagens é obrigatória");
            return ResponseEntity.badRequest().body(response);
        }
        
        List<Long> messageIds = messageIdsInt.stream()
                .map(Integer::longValue)
                .toList();
        
        chatMessageService.markMessagesAsViewed(messageIds, userEmail);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("messageIds", messageIds);
        response.put("userEmail", userEmail);
        
        return ResponseEntity.ok(response);
    }
}

