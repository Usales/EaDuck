package com.eaduck.backend.repository;

import com.eaduck.backend.model.MessageView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageViewRepository extends JpaRepository<MessageView, Long> {
    
    /**
     * Busca todas as visualizações de uma mensagem
     */
    List<MessageView> findByMessageId(Long messageId);
    
    /**
     * Verifica se um usuário já visualizou uma mensagem
     */
    boolean existsByMessageIdAndUserEmail(Long messageId, String userEmail);
    
    /**
     * Busca visualização específica
     */
    Optional<MessageView> findByMessageIdAndUserEmail(Long messageId, String userEmail);
    
    /**
     * Busca visualizações de múltiplas mensagens
     */
    @Query("SELECT mv FROM MessageView mv WHERE mv.messageId IN :messageIds AND mv.userEmail = :userEmail")
    List<MessageView> findByMessageIdsAndUserEmail(@Param("messageIds") List<Long> messageIds, @Param("userEmail") String userEmail);
    
    /**
     * Conta visualizações de uma mensagem
     */
    long countByMessageId(Long messageId);
}

