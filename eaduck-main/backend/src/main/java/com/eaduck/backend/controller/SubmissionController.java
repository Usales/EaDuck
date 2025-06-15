package com.eaduck.backend.controller;

import com.eaduck.backend.model.submission.Submission;
import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.SubmissionRepository;
import com.eaduck.backend.repository.TaskRepository;
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
        submissionRepository.save(submission);
        return ResponseEntity.ok(submission);
    }

    @GetMapping("/task/{taskId}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<List<Submission>> getSubmissionsByTask(@PathVariable Long taskId) {
        return ResponseEntity.ok(submissionRepository.findByTaskId(taskId));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN') or #studentId == authentication.name")
    public ResponseEntity<List<Submission>> getSubmissionsByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(submissionRepository.findByStudentId(studentId));
    }
} 