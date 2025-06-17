package com.eaduck.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

@RestController
@RequestMapping("/submission")
public class SubmissionController {

    private static final Logger logger = LoggerFactory.getLogger(SubmissionController.class);

    @PostMapping("/task/{taskId}/upload")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> submitTaskWithFile(
            @PathVariable Long taskId,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            Optional<Task> taskOpt = taskRepository.findById(taskId);
            User student = userRepository.findByEmail(email).orElse(null);
            if (taskOpt.isEmpty() || student == null) {
                logger.error("Tarefa ou aluno não encontrado. taskId={}, email={}", taskId, email);
                return ResponseEntity.badRequest().body("Tarefa ou aluno não encontrado.");
            }
            Task task = taskOpt.get();
            User teacher = task.getCreatedBy();
            // ... restante do método igual, usando 'student' ...
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Erro ao enviar tarefa", e);
            return ResponseEntity.internalServerError().body("Erro ao enviar tarefa");
        }
    }
} 