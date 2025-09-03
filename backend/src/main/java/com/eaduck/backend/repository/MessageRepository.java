package com.eaduck.backend.repository;

import com.eaduck.backend.model.message.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findBySenderId(Long senderId);
    List<Message> findByReceiverId(Long receiverId);
} 