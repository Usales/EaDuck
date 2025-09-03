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
import java.util.ArrayList;
import java.util.List;
import java.time.LocalDate;
import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.model.submission.Submission;

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
    public ResponseEntity<List<Map<String, Object>>> getTasksByClassroom(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }
        List<Map<String, Object>> data = new ArrayList<>();
        List<Classroom> classrooms = user.getRole() == Role.ADMIN
            ? classroomRepository.findAll()
            : (user.getRole() == Role.TEACHER ? new ArrayList<>(user.getClassroomsAsTeacher()) : new ArrayList<>(user.getClassrooms()));

        for (Classroom classroom : classrooms) {
            int concluidas = 0, pendentes = 0, atrasadas = 0;
            List<Task> tasks = taskRepository.findByClassroomId(classroom.getId());
            for (Task task : tasks) {
                List<Submission> submissions = submissionRepository.findByTaskId(task.getId());
                boolean hasSubmission = !submissions.isEmpty();
                LocalDate dueDate = task.getDueDate().toLocalDate();
                LocalDate today = LocalDate.now();
                if (hasSubmission) {
                    concluidas++;
                } else if (today.isAfter(dueDate)) {
                    atrasadas++;
                } else {
                    pendentes++;
                }
            }
            Map<String, Object> classroomStatus = new HashMap<>();
            classroomStatus.put("classroom", classroom.getName());
            classroomStatus.put("concluidas", concluidas);
            classroomStatus.put("pendentes", pendentes);
            classroomStatus.put("atrasadas", atrasadas);
            data.add(classroomStatus);
        }
        return ResponseEntity.ok(data);
    }
} 