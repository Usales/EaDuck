package com.eaduck.backend.controller;

import com.eaduck.backend.model.task.dto.TaskDTO;
import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.repository.TaskRepository;
import com.eaduck.backend.service.TaskService;
import com.eaduck.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<TaskDTO> createTask(@RequestBody TaskDTO dto, Authentication authentication) {
        String email = authentication.getName();
        Long creatorId = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado")).getId();
        Task task = taskService.createTask(dto, creatorId);
        TaskDTO response = TaskDTO.builder()
            .id(task.getId())
            .title(task.getTitle())
            .description(task.getDescription())
            .dueDate(task.getDueDate())
            .classroomId(task.getClassroom().getId())
            .classroomName(task.getClassroom().getName())
            .createdById(task.getCreatedBy().getId())
            .createdByName(task.getCreatedBy().getEmail())
            .createdAt(task.getCreatedAt())
            .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/classroom/{classroomId}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<List<TaskDTO>> getTasksByClassroom(@PathVariable Long classroomId) {
        List<Task> tasks = taskRepository.findByClassroomId(classroomId);
        List<TaskDTO> dtos = tasks.stream().map(task -> TaskDTO.builder()
            .id(task.getId())
            .title(task.getTitle())
            .description(task.getDescription())
            .dueDate(task.getDueDate())
            .classroomId(task.getClassroom().getId())
            .classroomName(task.getClassroom().getName())
            .createdById(task.getCreatedBy().getId())
            .createdByName(task.getCreatedBy().getEmail())
            .createdAt(task.getCreatedAt())
            .build()
        ).toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<List<TaskDTO>> getAllTasks() {
        List<Task> tasks = taskRepository.findAll();
        List<TaskDTO> dtos = tasks.stream().map(task -> TaskDTO.builder()
            .id(task.getId())
            .title(task.getTitle())
            .description(task.getDescription())
            .dueDate(task.getDueDate())
            .classroomId(task.getClassroom().getId())
            .classroomName(task.getClassroom().getName())
            .createdById(task.getCreatedBy().getId())
            .createdByName(task.getCreatedBy().getEmail())
            .createdAt(task.getCreatedAt())
            .build()
        ).toList();
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<TaskDTO> updateTask(@PathVariable Long id, @RequestBody TaskDTO dto) {
        return taskRepository.findById(id)
            .map(task -> {
                task.setTitle(dto.getTitle());
                task.setDescription(dto.getDescription());
                task.setDueDate(dto.getDueDate());
                taskRepository.save(task);
                TaskDTO response = TaskDTO.builder()
                    .id(task.getId())
                    .title(task.getTitle())
                    .description(task.getDescription())
                    .dueDate(task.getDueDate())
                    .classroomId(task.getClassroom().getId())
                    .classroomName(task.getClassroom().getName())
                    .createdById(task.getCreatedBy().getId())
                    .createdByName(task.getCreatedBy().getEmail())
                    .createdAt(task.getCreatedAt())
                    .build();
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> deleteTask(@PathVariable Long id) {
        if (!taskRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        taskRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}