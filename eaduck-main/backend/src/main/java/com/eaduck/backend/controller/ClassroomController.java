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

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Classroom> createClassroom(@RequestBody Classroom classroom) {
        classroom.setId(null);
        classroom.setCreatedAt(java.time.LocalDateTime.now());
        Classroom saved = classroomRepository.save(classroom);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Classroom> updateClassroom(@PathVariable Long id, @RequestBody Classroom classroom) {
        Optional<Classroom> classroomOpt = classroomRepository.findById(id);
        if (classroomOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Classroom existing = classroomOpt.get();
        existing.setName(classroom.getName());
        existing.setAcademicYear(classroom.getAcademicYear());
        if (classroom.getTeacher() != null) {
            existing.setTeacher(classroom.getTeacher());
        }
        Classroom updated = classroomRepository.save(existing);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteClassroom(@PathVariable Long id) {
        if (!classroomRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        classroomRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{classroomId}/add-student/{studentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addStudentToClassroom(@PathVariable Long classroomId, @PathVariable Long studentId) {
        Optional<Classroom> classroomOpt = classroomRepository.findById(classroomId);
        Optional<User> studentOpt = userRepository.findById(studentId);
        if (classroomOpt.isEmpty() || studentOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Turma ou aluno não encontrado.");
        }
        User student = studentOpt.get();
        if (!student.getRole().name().equals("STUDENT")) {
            return ResponseEntity.badRequest().body("Usuário não é aluno.");
        }
        Classroom classroom = classroomOpt.get();
        classroom.getStudents().add(student);
        classroomRepository.save(classroom);
        return ResponseEntity.ok("Aluno adicionado à turma.");
    }

    @DeleteMapping("/{classroomId}/remove-student/{studentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> removeStudentFromClassroom(@PathVariable Long classroomId, @PathVariable Long studentId) {
        Optional<Classroom> classroomOpt = classroomRepository.findById(classroomId);
        Optional<User> studentOpt = userRepository.findById(studentId);
        if (classroomOpt.isEmpty() || studentOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Turma ou aluno não encontrado.");
        }
        Classroom classroom = classroomOpt.get();
        User student = studentOpt.get();
        classroom.getStudents().remove(student);
        classroomRepository.save(classroom);
        return ResponseEntity.ok("Aluno removido da turma.");
    }

    @GetMapping("/{id}/members")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> getClassroomMembers(@PathVariable Long id) {
        Optional<Classroom> classroomOpt = classroomRepository.findById(id);
        if (classroomOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Classroom classroom = classroomOpt.get();
        return ResponseEntity.ok(new java.util.HashMap<>() {{
            put("teacher", classroom.getTeacher());
            put("students", classroom.getStudents());
        }});
    }
}