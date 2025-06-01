package com.eaduck.backend.controller;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.ClassroomRepository;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/classrooms")
public class ClassroomController {

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<List<Classroom>> getAllClassrooms() {
        return ResponseEntity.ok(classroomRepository.findAll());
    }

    @PostMapping("/{classroomId}/assign-teacher/{teacherId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignTeacher(@PathVariable Long classroomId, @PathVariable Long teacherId) {
        Optional<Classroom> classroomOpt = classroomRepository.findById(classroomId);
        Optional<User> teacherOpt = userRepository.findById(teacherId);

        if (!classroomOpt.isPresent()) {
            return ResponseEntity.badRequest().body("Turma não encontrada.");
        }
        if (!teacherOpt.isPresent() || !teacherOpt.get().getRole().name().equals("TEACHER")) {
            return ResponseEntity.badRequest().body("Professor não encontrado ou inválido.");
        }

        Classroom classroom = classroomOpt.get();
        classroom.setTeacher(teacherOpt.get());
        classroomRepository.save(classroom);

        // Notificar alunos da turma
        String message = "Novo professor atribuído à turma: " + classroom.getName();
        notificationService.notifyClassroom(classroomId, null, message, "TEACHER_ASSIGNED");

        return ResponseEntity.ok("Professor atribuído com sucesso.");
    }
}