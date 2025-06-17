package com.eaduck.backend.controller;

import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.repository.ClassroomRepository;
import com.eaduck.backend.repository.TaskRepository;
import com.eaduck.backend.repository.SubmissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.model.enums.Role;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ClassroomRepository classroomRepository;
    @Autowired
    private TaskRepository taskRepository;
    @Autowired(required = false)
    private SubmissionRepository submissionRepository;

    @GetMapping("/kpis")
    public ResponseEntity<Map<String, Object>> getKpis() {
        Map<String, Object> kpis = new HashMap<>();
        kpis.put("users", userRepository.count());
        kpis.put("classrooms", classroomRepository.count());
        kpis.put("tasks", taskRepository.count());
        kpis.put("submissions", submissionRepository != null ? submissionRepository.count() : 0);
        return ResponseEntity.ok(kpis);
    }

    // Exemplo de endpoint para gráfico de tarefas por sala
    @GetMapping("/tasks-by-classroom")
    public ResponseEntity<Map<String, Object>> getTasksByClassroom(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }
        Map<String, Object> data = new HashMap<>();
        if (user.getRole() == Role.ADMIN) {
            classroomRepository.findAll().forEach(classroom -> {
                data.put(classroom.getName(), taskRepository.findByClassroomId(classroom.getId()).size());
            });
        } else if (user.getRole() == Role.TEACHER) {
            user.getClassroomsAsTeacher().forEach(classroom -> {
                data.put(classroom.getName(), taskRepository.findByClassroomId(classroom.getId()).size());
            });
        } else {
            user.getClassrooms().forEach(classroom -> {
                data.put(classroom.getName(), taskRepository.findByClassroomId(classroom.getId()).size());
            });
        }
        return ResponseEntity.ok(data);
    }
} 