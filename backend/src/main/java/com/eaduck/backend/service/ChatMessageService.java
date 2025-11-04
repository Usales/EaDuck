package com.eaduck.backend.service;

import com.eaduck.backend.model.ChatMessage;
import com.eaduck.backend.model.ChatMessageEntity;
import com.eaduck.backend.model.MessageReaction;
import com.eaduck.backend.model.MessageView;
import com.eaduck.backend.repository.ChatMessageRepository;
import com.eaduck.backend.repository.MessageReactionRepository;
import com.eaduck.backend.repository.MessageViewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatMessageService {
    
    private final ChatMessageRepository chatMessageRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final MessageViewRepository messageViewRepository;
    
    /**
     * Salva uma mensagem de chat
     */
    @Transactional
    public ChatMessageEntity saveMessage(ChatMessage chatMessage) {
        log.info("Salvando mensagem: {} de {} para sala {}", 
                chatMessage.getContent(), chatMessage.getSender(), chatMessage.getClassroomId());
        
        ChatMessageEntity.ChatMessageEntityBuilder builder = ChatMessageEntity.builder()
                .senderEmail(chatMessage.getSender())
                .senderName(chatMessage.getSenderName())
                .senderRole(chatMessage.getSenderRole())
                .content(chatMessage.getContent())
                .messageType(convertMessageType(chatMessage.getType()))
                .classroomId(chatMessage.getClassroomId() != null ? 
                    Long.parseLong(chatMessage.getClassroomId()) : null);
        
        // Adicionar campos de arquivo se existirem
        if (chatMessage.getFileUrl() != null) {
            builder.fileUrl(chatMessage.getFileUrl())
                   .fileType(chatMessage.getFileType())
                   .fileName(chatMessage.getFileName())
                   .fileSize(chatMessage.getFileSize());
        }
        
        // Adicionar mensagem respondida se existir
        if (chatMessage.getRepliedToMessageId() != null) {
            Long repliedToId = Long.parseLong(chatMessage.getRepliedToMessageId());
            builder.repliedToMessageId(repliedToId);
        }
        
        ChatMessageEntity saved = chatMessageRepository.save(builder.build());
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
            case IMAGE:
                return ChatMessageEntity.MessageType.IMAGE;
            case AUDIO:
                return ChatMessageEntity.MessageType.AUDIO;
            default:
                return ChatMessageEntity.MessageType.CHAT;
        }
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
            case IMAGE:
                return ChatMessage.MessageType.IMAGE;
            case AUDIO:
                return ChatMessage.MessageType.AUDIO;
            default:
                return ChatMessage.MessageType.CHAT;
        }
    }
    
    /**
     * Adiciona ou remove uma reação de uma mensagem
     */
    @Transactional
    public boolean toggleReaction(Long messageId, String userEmail, String emoji) {
        Optional<MessageReaction> existing = messageReactionRepository
                .findByMessageIdAndUserEmailAndEmoji(messageId, userEmail, emoji);
        
        if (existing.isPresent()) {
            // Remove reação existente
            messageReactionRepository.delete(existing.get());
            log.info("Reação {} removida da mensagem {} pelo usuário {}", emoji, messageId, userEmail);
            return false; // Reação removida
        } else {
            // Adiciona nova reação
            MessageReaction reaction = MessageReaction.builder()
                    .messageId(messageId)
                    .userEmail(userEmail)
                    .emoji(emoji)
                    .build();
            messageReactionRepository.save(reaction);
            log.info("Reação {} adicionada à mensagem {} pelo usuário {}", emoji, messageId, userEmail);
            return true; // Reação adicionada
        }
    }
    
    /**
     * Busca todas as reações de uma mensagem agrupadas por emoji
     */
    public List<ChatMessage.ReactionCount> getReactionsByMessageId(Long messageId) {
        List<MessageReaction> reactions = messageReactionRepository.findByMessageId(messageId);
        
        // Agrupar por emoji
        Map<String, List<String>> emojiMap = reactions.stream()
                .collect(Collectors.groupingBy(
                    MessageReaction::getEmoji,
                    Collectors.mapping(MessageReaction::getUserEmail, Collectors.toList())
                ));
        
        return emojiMap.entrySet().stream()
                .map(entry -> new ChatMessage.ReactionCount(
                    entry.getKey(),
                    (long) entry.getValue().size(),
                    entry.getValue()
                ))
                .collect(Collectors.toList());
    }
    
    /**
     * Marca mensagens como visualizadas
     */
    @Transactional
    public void markMessagesAsViewed(List<Long> messageIds, String userEmail) {
        for (Long messageId : messageIds) {
            if (!messageViewRepository.existsByMessageIdAndUserEmail(messageId, userEmail)) {
                MessageView view = MessageView.builder()
                        .messageId(messageId)
                        .userEmail(userEmail)
                        .build();
                messageViewRepository.save(view);
                log.debug("Mensagem {} marcada como visualizada pelo usuário {}", messageId, userEmail);
            }
        }
    }
    
    /**
     * Verifica se uma mensagem foi visualizada por um usuário
     */
    public boolean isMessageViewed(Long messageId, String userEmail) {
        return messageViewRepository.existsByMessageIdAndUserEmail(messageId, userEmail);
    }
    
    /**
     * Busca mensagem por ID para resposta
     */
    public Optional<ChatMessageEntity> findMessageById(Long messageId) {
        return chatMessageRepository.findById(messageId);
    }
    
    /**
     * Atualiza a conversão para incluir novos campos
     */
    private ChatMessage convertToChatMessage(ChatMessageEntity entity) {
        ChatMessage chatMessage = new ChatMessage();
        chatMessage.setId(entity.getId().toString());
        chatMessage.setType(convertToChatMessageType(entity.getMessageType()));
        chatMessage.setContent(entity.getContent());
        chatMessage.setSender(entity.getSenderEmail());
        chatMessage.setSenderName(entity.getSenderName());
        chatMessage.setSenderRole(entity.getSenderRole());
        chatMessage.setMessage(entity.getContent());
        chatMessage.setTimestamp(Date.from(entity.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant()));
        chatMessage.setClassroomId(entity.getClassroomId() != null ? entity.getClassroomId().toString() : null);
        
        // Campos de arquivo
        if (entity.getFileUrl() != null) {
            chatMessage.setFileUrl(entity.getFileUrl());
            chatMessage.setFileType(entity.getFileType());
            chatMessage.setFileName(entity.getFileName());
            chatMessage.setFileSize(entity.getFileSize());
        }
        
        // Mensagem respondida (sem recursão - apenas dados básicos)
        if (entity.getRepliedToMessageId() != null) {
            chatMessage.setRepliedToMessageId(entity.getRepliedToMessageId().toString());
            // Buscar mensagem respondida do banco (sem recursão)
            Optional<ChatMessageEntity> repliedEntity = findMessageById(entity.getRepliedToMessageId());
            if (repliedEntity.isPresent()) {
                ChatMessageEntity replied = repliedEntity.get();
                ChatMessage repliedMsg = new ChatMessage();
                repliedMsg.setId(replied.getId().toString());
                repliedMsg.setContent(replied.getContent());
                repliedMsg.setSender(replied.getSenderEmail());
                repliedMsg.setSenderName(replied.getSenderName());
                repliedMsg.setMessage(replied.getContent());
                chatMessage.setRepliedToMessage(repliedMsg);
            }
        }
        
        // Buscar reações
        List<ChatMessage.ReactionCount> reactions = getReactionsByMessageId(entity.getId());
        chatMessage.setReactions(reactions);
        
        return chatMessage;
    }
}
