package com.eaduck.backend.controller;

import com.eaduck.backend.model.ChatMessage;
import com.eaduck.backend.service.ChatMessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
    private final SimpMessagingTemplate messagingTemplate;

    public ChatReactionController(ChatMessageService chatMessageService, SimpMessagingTemplate messagingTemplate) {
        this.chatMessageService = chatMessageService;
        this.messagingTemplate = messagingTemplate;
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
        
        System.out.println("========================================");
        System.out.println("[REACTION-CONTROLLER] ===== PROCESSANDO REAÇÃO =====");
        System.out.println("[REACTION-CONTROLLER] MessageId: " + messageId);
        System.out.println("[REACTION-CONTROLLER] UserEmail: " + userEmail);
        System.out.println("[REACTION-CONTROLLER] Emoji: " + emoji);
        
        boolean added = chatMessageService.toggleReaction(messageId, userEmail, emoji);
        System.out.println("[REACTION-CONTROLLER] Reação " + (added ? "ADICIONADA" : "REMOVIDA"));
        
        // Buscar a mensagem para obter o classroomId
        java.util.Optional<com.eaduck.backend.model.ChatMessageEntity> messageOpt = chatMessageService.findMessageById(messageId);
        
        List<ChatMessage.ReactionCount> reactions = chatMessageService.getReactionsByMessageId(messageId);
        System.out.println("[REACTION-CONTROLLER] Total de reações após operação: " + reactions.size());
        reactions.forEach(r -> System.out.println("[REACTION-CONTROLLER]   - " + r.getEmoji() + ": " + r.getCount() + " reações"));
        
        Map<String, Object> response = new HashMap<>();
        response.put("added", added);
        response.put("messageId", messageId);
        response.put("emoji", emoji);
        response.put("userEmail", userEmail);
        response.put("reactions", reactions);
        
        // Broadcast da atualização de reações em tempo real
        if (messageOpt.isPresent()) {
            com.eaduck.backend.model.ChatMessageEntity message = messageOpt.get();
            String classroomId = message.getClassroomId() != null ? message.getClassroomId().toString() : null;
            
            Map<String, Object> reactionUpdate = new HashMap<>();
            reactionUpdate.put("messageId", messageId);
            reactionUpdate.put("reactions", reactions);
            
            if (classroomId != null) {
                // Broadcast para a sala específica
                System.out.println("[REACTION-CONTROLLER] Enviando broadcast para sala: " + classroomId);
                messagingTemplate.convertAndSend("/topic/reactions.room." + classroomId, reactionUpdate);
            } else {
                // Broadcast para o chat geral
                System.out.println("[REACTION-CONTROLLER] Enviando broadcast para chat geral");
                messagingTemplate.convertAndSend("/topic/reactions.public", reactionUpdate);
            }
            System.out.println("[REACTION-CONTROLLER] Broadcast enviado com sucesso");
        } else {
            System.out.println("[REACTION-CONTROLLER] ATENÇÃO: Mensagem não encontrada para broadcast");
        }
        
        System.out.println("[REACTION-CONTROLLER] ===== REAÇÃO PROCESSADA =====");
        System.out.println("========================================");
        
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

