package com.eaduck.backend.controller;

import com.eaduck.backend.model.user.User;
import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.model.user.dto.UserDTO;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.repository.ClassroomRepository;
import com.eaduck.backend.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/search")
public class SearchController {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ClassroomRepository classroomRepository;
    @Autowired
    private TaskRepository taskRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> search(@RequestParam("q") String query) {
        Map<String, Object> result = new HashMap<>();
        List<UserDTO> users = userRepository.findAll().stream()
                .filter(u -> u.getEmail().toLowerCase().contains(query.toLowerCase()))
                .map(user -> UserDTO.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .role(user.getRole())
                    .isActive(user.isActive())
                    .build())
                .collect(Collectors.toList());
        List<Classroom> classrooms = classroomRepository.findAll().stream()
                .filter(c -> c.getName().toLowerCase().contains(query.toLowerCase()))
                .collect(Collectors.toList());
        List<Task> tasks = taskRepository.findAll().stream()
                .filter(t -> t.getTitle().toLowerCase().contains(query.toLowerCase()))
                .collect(Collectors.toList());
        result.put("users", users);
        result.put("classrooms", classrooms);
        result.put("tasks", tasks);
        return ResponseEntity.ok(result);
    }
} 