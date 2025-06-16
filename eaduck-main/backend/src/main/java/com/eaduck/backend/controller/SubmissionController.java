package com.eaduck.backend.controller;

import com.eaduck.backend.model.submission.Submission;
import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.model.submission.dto.SubmissionDTO;
import com.eaduck.backend.model.user.dto.UserDTO;
import com.eaduck.backend.repository.SubmissionRepository;
import com.eaduck.backend.repository.TaskRepository;
import com.eaduck.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    @Autowired
    private SubmissionRepository submissionRepository;
    @Autowired
    private TaskRepository taskRepository;
    @Autowired
    private UserRepository userRepository;

    @PostMapping("/task/{taskId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> submitTask(@PathVariable Long taskId, @RequestBody String content, Authentication authentication) {
        Long studentId = Long.valueOf(authentication.getName());
        Optional<Task> taskOpt = taskRepository.findById(taskId);
        Optional<User> studentOpt = userRepository.findById(studentId);
        if (taskOpt.isEmpty() || studentOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Tarefa ou aluno não encontrado.");
        }
        Submission submission = Submission.builder()
                .task(taskOpt.get())
                .student(studentOpt.get())
                .content(content)
                .submittedAt(LocalDateTime.now())
                .build();
        submission = submissionRepository.save(submission);
        SubmissionDTO dto = SubmissionDTO.builder()
                .id(submission.getId())
                .taskId(submission.getTask().getId())
                .student(UserDTO.builder()
                    .id(submission.getStudent().getId())
                    .email(submission.getStudent().getEmail())
                    .role(submission.getStudent().getRole())
                    .isActive(submission.getStudent().isActive())
                    .build())
                .content(submission.getContent())
                .submittedAt(submission.getSubmittedAt())
                .build();
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/task/{taskId}/upload")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> submitTaskWithFile(
            @PathVariable Long taskId,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        Long studentId = Long.valueOf(authentication.getName());
        Optional<Task> taskOpt = taskRepository.findById(taskId);
        Optional<User> studentOpt = userRepository.findById(studentId);
        if (taskOpt.isEmpty() || studentOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Tarefa ou aluno não encontrado.");
        }
        String fileUrl = null;
        if (!file.isEmpty()) {
            try {
                String uploadDir = "uploads/";
                String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                java.nio.file.Path path = java.nio.file.Paths.get(uploadDir + fileName);
                java.nio.file.Files.createDirectories(path.getParent());
                java.nio.file.Files.write(path, file.getBytes());
                fileUrl = "/files/" + fileName;
            } catch (Exception e) {
                return ResponseEntity.status(500).body("Erro ao salvar arquivo: " + e.getMessage());
            }
        }
        Submission submission = Submission.builder()
                .task(taskOpt.get())
                .student(studentOpt.get())
                .content(content)
                .submittedAt(java.time.LocalDateTime.now())
                .build();
        try {
            java.lang.reflect.Field f = Submission.class.getDeclaredField("fileUrl");
            f.setAccessible(true);
            f.set(submission, fileUrl);
        } catch (Exception ignore) {}
        submissionRepository.save(submission);
        return ResponseEntity.ok(submission);
    }

    @GetMapping("/task/{taskId}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<List<SubmissionDTO>> getSubmissionsByTask(@PathVariable Long taskId) {
        List<Submission> submissions = submissionRepository.findByTaskId(taskId);
        List<SubmissionDTO> dtos = submissions.stream().map(sub -> SubmissionDTO.builder()
            .id(sub.getId())
            .taskId(sub.getTask().getId())
            .student(UserDTO.builder()
                .id(sub.getStudent().getId())
                .email(sub.getStudent().getEmail())
                .role(sub.getStudent().getRole())
                .isActive(sub.getStudent().isActive())
                .build())
            .content(sub.getContent())
            .submittedAt(sub.getSubmittedAt())
            .build()).toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN') or #studentId == authentication.name")
    public ResponseEntity<List<SubmissionDTO>> getSubmissionsByStudent(@PathVariable Long studentId) {
        List<Submission> submissions = submissionRepository.findByStudentId(studentId);
        List<SubmissionDTO> dtos = submissions.stream().map(sub -> SubmissionDTO.builder()
            .id(sub.getId())
            .taskId(sub.getTask().getId())
            .student(UserDTO.builder()
                .id(sub.getStudent().getId())
                .email(sub.getStudent().getEmail())
                .role(sub.getStudent().getRole())
                .isActive(sub.getStudent().isActive())
                .build())
            .content(sub.getContent())
            .submittedAt(sub.getSubmittedAt())
            .build()).toList();
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<Submission> updateSubmission(@PathVariable Long id, @RequestBody Submission updated) {
        return submissionRepository.findById(id)
            .map(submission -> {
                submission.setContent(updated.getContent());
                submissionRepository.save(submission);
                return ResponseEntity.ok(submission);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/evaluate")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<Submission> evaluateSubmission(
        @PathVariable Long id,
        @RequestBody java.util.Map<String, Object> evaluation
    ) {
        return submissionRepository.findById(id)
            .map(submission -> {
                if (evaluation.containsKey("grade")) {
                    submission.setGrade(Double.valueOf(evaluation.get("grade").toString()));
                }
                if (evaluation.containsKey("feedback")) {
                    submission.setFeedback((String) evaluation.get("feedback"));
                }
                submission.setEvaluatedAt(java.time.LocalDateTime.now());
                submissionRepository.save(submission);
                return ResponseEntity.ok(submission);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> deleteSubmission(@PathVariable Long id) {
        if (!submissionRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        submissionRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
} 