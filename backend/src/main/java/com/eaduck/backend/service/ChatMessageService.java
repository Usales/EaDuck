package com.eaduck.backend.service;

import com.eaduck.backend.model.ChatMessage;
import com.eaduck.backend.model.ChatMessageEntity;
import com.eaduck.backend.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatMessageService {
    
    private final ChatMessageRepository chatMessageRepository;
    
    /**
     * Salva uma mensagem de chat
     */
    @Transactional
    public ChatMessageEntity saveMessage(ChatMessage chatMessage) {
        log.info("Salvando mensagem: {} de {} para sala {}", 
                chatMessage.getContent(), chatMessage.getSender(), chatMessage.getClassroomId());
        
        ChatMessageEntity entity = ChatMessageEntity.builder()
                .senderEmail(chatMessage.getSender())
                .senderName(chatMessage.getSenderName())
                .senderRole(chatMessage.getSenderRole())
                .content(chatMessage.getContent())
                .messageType(convertMessageType(chatMessage.getType()))
                .classroomId(chatMessage.getClassroomId() != null ? 
                    Long.parseLong(chatMessage.getClassroomId()) : null)
                .build();
        
        ChatMessageEntity saved = chatMessageRepository.save(entity);
        log.info("Mensagem salva com ID: {}", saved.getId());
        
        return saved;
    }
    
    /**
     * Busca mensagens de uma sala específica
     */
    public List<ChatMessage> getMessagesByClassroomId(Long classroomId) {
        log.info("Buscando mensagens da sala: {}", classroomId);
        
        List<ChatMessageEntity> entities = chatMessageRepository
                .findByClassroomIdOrderByCreatedAtAsc(classroomId);
        
        return entities.stream()
                .map(this::convertToChatMessage)
                .collect(Collectors.toList());
    }
    
    /**
     * Busca mensagens do chat geral
     */
    public List<ChatMessage> getGeneralChatMessages() {
        log.info("Buscando mensagens do chat geral");
        
        List<ChatMessageEntity> entities = chatMessageRepository
                .findGeneralChatMessagesOrderByCreatedAtAsc();
        
        return entities.stream()
                .map(this::convertToChatMessage)
                .collect(Collectors.toList());
    }
    
    /**
     * Busca mensagens de uma sala com paginação
     */
    public Page<ChatMessage> getMessagesByClassroomId(Long classroomId, int page, int size) {
        log.info("Buscando mensagens da sala {} com paginação: página {}, tamanho {}", 
                classroomId, page, size);
        
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessageEntity> entities = chatMessageRepository
                .findByClassroomIdOrderByCreatedAtAsc(classroomId, pageable);
        
        return entities.map(this::convertToChatMessage);
    }
    
    /**
     * Busca mensagens do chat geral com paginação
     */
    public Page<ChatMessage> getGeneralChatMessages(int page, int size) {
        log.info("Buscando mensagens do chat geral com paginação: página {}, tamanho {}", 
                page, size);
        
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessageEntity> entities = chatMessageRepository
                .findGeneralChatMessagesOrderByCreatedAtAsc(pageable);
        
        return entities.map(this::convertToChatMessage);
    }
    
    /**
     * Busca mensagens recentes de uma sala
     */
    public List<ChatMessage> getRecentMessagesByClassroomId(Long classroomId, int limit) {
        log.info("Buscando {} mensagens recentes da sala: {}", limit, classroomId);
        
        Pageable pageable = PageRequest.of(0, limit);
        Page<ChatMessageEntity> entities = chatMessageRepository
                .findByClassroomIdOrderByCreatedAtAsc(classroomId, pageable);
        
        return entities.getContent().stream()
                .map(this::convertToChatMessage)
                .collect(Collectors.toList());
    }
    
    /**
     * Busca mensagens recentes do chat geral
     */
    public List<ChatMessage> getRecentGeneralChatMessages(int limit) {
        log.info("Buscando {} mensagens recentes do chat geral", limit);
        
        Pageable pageable = PageRequest.of(0, limit);
        Page<ChatMessageEntity> entities = chatMessageRepository
                .findGeneralChatMessagesOrderByCreatedAtAsc(pageable);
        
        return entities.getContent().stream()
                .map(this::convertToChatMessage)
                .collect(Collectors.toList());
    }
    
    /**
     * Conta mensagens de uma sala
     */
    public long countMessagesByClassroomId(Long classroomId) {
        return chatMessageRepository.countByClassroomId(classroomId);
    }
    
    /**
     * Conta mensagens do chat geral
     */
    public long countGeneralChatMessages() {
        return chatMessageRepository.countByClassroomIdIsNull();
    }
    
    /**
     * Converte MessageType do ChatMessage para MessageType do ChatMessageEntity
     */
    private ChatMessageEntity.MessageType convertMessageType(ChatMessage.MessageType type) {
        switch (type) {
            case CHAT:
                return ChatMessageEntity.MessageType.CHAT;
            case JOIN:
                return ChatMessageEntity.MessageType.JOIN;
            case LEAVE:
                return ChatMessageEntity.MessageType.LEAVE;
            default:
                return ChatMessageEntity.MessageType.CHAT;
        }
    }
    
    /**
     * Converte ChatMessageEntity para ChatMessage
     */
    private ChatMessage convertToChatMessage(ChatMessageEntity entity) {
        ChatMessage chatMessage = new ChatMessage();
        chatMessage.setType(convertToChatMessageType(entity.getMessageType()));
        chatMessage.setContent(entity.getContent());
        chatMessage.setSender(entity.getSenderEmail());
        chatMessage.setSenderName(entity.getSenderName());
        chatMessage.setSenderRole(entity.getSenderRole());
        chatMessage.setMessage(entity.getContent());
        chatMessage.setTimestamp(Date.from(entity.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant()));
        chatMessage.setClassroomId(entity.getClassroomId() != null ? entity.getClassroomId().toString() : null);
        
        return chatMessage;
    }
    
    /**
     * Converte MessageType do ChatMessageEntity para MessageType do ChatMessage
     */
    private ChatMessage.MessageType convertToChatMessageType(ChatMessageEntity.MessageType type) {
        switch (type) {
            case CHAT:
                return ChatMessage.MessageType.CHAT;
            case JOIN:
                return ChatMessage.MessageType.JOIN;
            case LEAVE:
                return ChatMessage.MessageType.LEAVE;
            default:
                return ChatMessage.MessageType.CHAT;
        }
    }
}
