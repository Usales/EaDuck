package com.eaduck.backend.controller;

import com.eaduck.backend.model.ChatMessage;
import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.enums.Role;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.ClassroomRepository;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.service.ChatMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatHistoryController {
    
    private final ChatMessageService chatMessageService;
    private final ClassroomRepository classroomRepository;
    private final UserRepository userRepository;
    
    /**
     * Busca mensagens do chat geral
     */
    @GetMapping("/general")
    public ResponseEntity<List<ChatMessage>> getGeneralChatMessages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        
        log.info("Buscando mensagens do chat geral - página: {}, tamanho: {}", page, size);
        
        try {
            if (page == 0 && size >= 1000) {
                // Para requests sem paginação, retornar todas as mensagens
                List<ChatMessage> messages = chatMessageService.getGeneralChatMessages();
                return ResponseEntity.ok(messages);
            } else {
                // Para requests com paginação
                Page<ChatMessage> messagesPage = chatMessageService.getGeneralChatMessages(page, size);
                return ResponseEntity.ok(messagesPage.getContent());
            }
        } catch (Exception e) {
            log.error("Erro ao buscar mensagens do chat geral", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Busca mensagens de uma sala específica
     */
    @GetMapping("/room/{classroomId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChatMessage>> getRoomChatMessages(
            @PathVariable Long classroomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Authentication authentication) {
        
        log.info("Buscando mensagens da sala {} - página: {}, tamanho: {}", classroomId, page, size);
        
        // Validar acesso à sala
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            log.warn("Usuário não encontrado: {}", authentication.getName());
            return ResponseEntity.status(403).build();
        }

        Classroom classroom = classroomRepository.findById(classroomId).orElse(null);
        if (classroom == null) {
            log.warn("Sala não encontrada: {}", classroomId);
            return ResponseEntity.notFound().build();
        }

        // Verifica se o usuário tem acesso à sala
        boolean hasAccess = false;
        if (user.getRole() == Role.ADMIN) {
            hasAccess = true;
        } else if (user.getRole() == Role.TEACHER) {
            hasAccess = user.getClassroomsAsTeacher().contains(classroom);
        } else {
            hasAccess = user.getClassrooms().contains(classroom);
        }

        if (!hasAccess) {
            log.warn("Usuário {} tentou acessar sala {} sem permissão", user.getEmail(), classroomId);
            return ResponseEntity.status(403).build();
        }
        
        try {
            if (page == 0 && size >= 1000) {
                // Para requests sem paginação, retornar todas as mensagens
                List<ChatMessage> messages = chatMessageService.getMessagesByClassroomId(classroomId);
                return ResponseEntity.ok(messages);
            } else {
                // Para requests com paginação
                Page<ChatMessage> messagesPage = chatMessageService.getMessagesByClassroomId(classroomId, page, size);
                return ResponseEntity.ok(messagesPage.getContent());
            }
        } catch (Exception e) {
            log.error("Erro ao buscar mensagens da sala {}", classroomId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Busca mensagens recentes do chat geral
     */
    @GetMapping("/general/recent")
    public ResponseEntity<List<ChatMessage>> getRecentGeneralChatMessages(
            @RequestParam(defaultValue = "20") int limit) {
        
        log.info("Buscando {} mensagens recentes do chat geral", limit);
        
        try {
            List<ChatMessage> messages = chatMessageService.getRecentGeneralChatMessages(limit);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Erro ao buscar mensagens recentes do chat geral", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Busca mensagens recentes de uma sala específica
     */
    @GetMapping("/room/{classroomId}/recent")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChatMessage>> getRecentRoomChatMessages(
            @PathVariable Long classroomId,
            @RequestParam(defaultValue = "20") int limit,
            Authentication authentication) {
        
        log.info("Buscando {} mensagens recentes da sala {}", limit, classroomId);
        
        // Validar acesso à sala
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            log.warn("Usuário não encontrado: {}", authentication.getName());
            return ResponseEntity.status(403).build();
        }

        Classroom classroom = classroomRepository.findById(classroomId).orElse(null);
        if (classroom == null) {
            log.warn("Sala não encontrada: {}", classroomId);
            return ResponseEntity.notFound().build();
        }

        // Verifica se o usuário tem acesso à sala
        boolean hasAccess = false;
        if (user.getRole() == Role.ADMIN) {
            hasAccess = true;
        } else if (user.getRole() == Role.TEACHER) {
            hasAccess = user.getClassroomsAsTeacher().contains(classroom);
        } else {
            hasAccess = user.getClassrooms().contains(classroom);
        }

        if (!hasAccess) {
            log.warn("Usuário {} tentou acessar sala {} sem permissão", user.getEmail(), classroomId);
            return ResponseEntity.status(403).build();
        }
        
        try {
            List<ChatMessage> messages = chatMessageService.getRecentMessagesByClassroomId(classroomId, limit);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Erro ao buscar mensagens recentes da sala {}", classroomId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Conta mensagens do chat geral
     */
    @GetMapping("/general/count")
    public ResponseEntity<Long> getGeneralChatMessageCount() {
        try {
            long count = chatMessageService.countGeneralChatMessages();
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            log.error("Erro ao contar mensagens do chat geral", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Conta mensagens de uma sala específica
     */
    @GetMapping("/room/{classroomId}/count")
    public ResponseEntity<Long> getRoomChatMessageCount(@PathVariable Long classroomId) {
        try {
            long count = chatMessageService.countMessagesByClassroomId(classroomId);
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            log.error("Erro ao contar mensagens da sala {}", classroomId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
