package com.eaduck.backend.repository;

import com.eaduck.backend.model.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {
    
    /**
     * Busca todas as reações de uma mensagem
     */
    List<MessageReaction> findByMessageId(Long messageId);
    
    /**
     * Busca uma reação específica de um usuário em uma mensagem
     */
    Optional<MessageReaction> findByMessageIdAndUserEmailAndEmoji(Long messageId, String userEmail, String emoji);
    
    /**
     * Verifica se um usuário já reagiu a uma mensagem com um emoji específico
     */
    boolean existsByMessageIdAndUserEmailAndEmoji(Long messageId, String userEmail, String emoji);
    
    /**
     * Remove uma reação específica
     */
    void deleteByMessageIdAndUserEmailAndEmoji(Long messageId, String userEmail, String emoji);
    
    /**
     * Remove todas as reações de um usuário em uma mensagem
     */
    void deleteByMessageIdAndUserEmail(Long messageId, String userEmail);
    
    /**
     * Conta reações por emoji de uma mensagem
     */
    @Query("SELECT mr.emoji, COUNT(mr) FROM MessageReaction mr WHERE mr.messageId = :messageId GROUP BY mr.emoji")
    List<Object[]> countReactionsByEmoji(@Param("messageId") Long messageId);
}

