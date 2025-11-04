package com.eaduck.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "message_reactions", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"message_id", "user_email", "emoji"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageReaction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "message_id", nullable = false)
    private Long messageId;
    
    @Column(name = "user_email", nullable = false)
    private String userEmail;
    
    @Column(name = "emoji", nullable = false, length = 10)
    private String emoji;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", insertable = false, updatable = false)
    private ChatMessageEntity message;
}

