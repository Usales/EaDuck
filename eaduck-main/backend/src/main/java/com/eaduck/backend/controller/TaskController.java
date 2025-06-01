package com.eaduck.backend.controller;

import com.eaduck.backend.model.task.dto.TaskDTO;
import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.repository.TaskRepository;
import com.eaduck.backend.service.TaskService;
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

    @PostMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<Task> createTask(@RequestBody TaskDTO dto, Authentication authentication) {
        Long creatorId = Long.valueOf(authentication.getName());
        Task task = taskService.createTask(dto, creatorId);
        return ResponseEntity.ok(task);
    }

    @GetMapping("/classroom/{classroomId}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<List<Task>> getTasksByClassroom(@PathVariable Long classroomId) {
        List<Task> tasks = taskRepository.findByClassroomId(classroomId);
        return ResponseEntity.ok(tasks);
    }
}