package com.eaduck.backend.controller;

import com.eaduck.backend.model.message.Message;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.MessageRepository;
import com.eaduck.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/messages")
public class MessageController {
    @Autowired
    private MessageRepository messageRepository;
    @Autowired
    private UserRepository userRepository;

    @PostMapping("/send/{receiverId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> sendMessage(@PathVariable Long receiverId, @RequestBody String content, Authentication authentication) {
        Long senderId = Long.valueOf(authentication.getName());
        Optional<User> senderOpt = userRepository.findById(senderId);
        Optional<User> receiverOpt = userRepository.findById(receiverId);
        if (senderOpt.isEmpty() || receiverOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Remetente ou destinatário não encontrado.");
        }
        Message message = Message.builder()
                .sender(senderOpt.get())
                .receiver(receiverOpt.get())
                .content(content)
                .sentAt(LocalDateTime.now())
                .build();
        messageRepository.save(message);
        return ResponseEntity.ok(message);
    }

    @GetMapping("/sent")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Message>> getSentMessages(Authentication authentication) {
        Long senderId = Long.valueOf(authentication.getName());
        return ResponseEntity.ok(messageRepository.findBySenderId(senderId));
    }

    @GetMapping("/received")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Message>> getReceivedMessages(Authentication authentication) {
        Long receiverId = Long.valueOf(authentication.getName());
        return ResponseEntity.ok(messageRepository.findByReceiverId(receiverId));
    }
} 