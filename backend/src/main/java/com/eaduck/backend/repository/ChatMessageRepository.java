package com.eaduck.backend.repository;

import com.eaduck.backend.model.ChatMessageEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {
    
    /**
     * Busca mensagens de uma sala específica
     */
    @Query("SELECT cm FROM ChatMessageEntity cm WHERE cm.classroomId = :classroomId ORDER BY cm.createdAt ASC")
    List<ChatMessageEntity> findByClassroomIdOrderByCreatedAtAsc(@Param("classroomId") Long classroomId);
    
    /**
     * Busca mensagens do chat geral (classroomId é NULL)
     */
    @Query("SELECT cm FROM ChatMessageEntity cm WHERE cm.classroomId IS NULL ORDER BY cm.createdAt ASC")
    List<ChatMessageEntity> findGeneralChatMessagesOrderByCreatedAtAsc();
    
    /**
     * Busca mensagens de uma sala com paginação
     */
    @Query("SELECT cm FROM ChatMessageEntity cm WHERE cm.classroomId = :classroomId ORDER BY cm.createdAt ASC")
    Page<ChatMessageEntity> findByClassroomIdOrderByCreatedAtAsc(@Param("classroomId") Long classroomId, Pageable pageable);
    
    /**
     * Busca mensagens do chat geral com paginação
     */
    @Query("SELECT cm FROM ChatMessageEntity cm WHERE cm.classroomId IS NULL ORDER BY cm.createdAt ASC")
    Page<ChatMessageEntity> findGeneralChatMessagesOrderByCreatedAtAsc(Pageable pageable);
    
    /**
     * Busca mensagens após uma data específica
     */
    @Query("SELECT cm FROM ChatMessageEntity cm WHERE cm.classroomId = :classroomId AND cm.createdAt > :since ORDER BY cm.createdAt ASC")
    List<ChatMessageEntity> findByClassroomIdAndCreatedAtAfterOrderByCreatedAtAsc(
        @Param("classroomId") Long classroomId, 
        @Param("since") LocalDateTime since
    );
    
    /**
     * Busca mensagens do chat geral após uma data específica
     */
    @Query("SELECT cm FROM ChatMessageEntity cm WHERE cm.classroomId IS NULL AND cm.createdAt > :since ORDER BY cm.createdAt ASC")
    List<ChatMessageEntity> findGeneralChatMessagesByCreatedAtAfterOrderByCreatedAtAsc(@Param("since") LocalDateTime since);
    
    /**
     * Conta mensagens de uma sala
     */
    long countByClassroomId(Long classroomId);
    
    /**
     * Conta mensagens do chat geral
     */
    long countByClassroomIdIsNull();
}
