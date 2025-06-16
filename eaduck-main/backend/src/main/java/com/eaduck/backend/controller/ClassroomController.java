package com.eaduck.backend.controller;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.ClassroomRepository;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.service.NotificationService;
import com.eaduck.backend.model.classroom.dto.ClassroomDTO;
import com.eaduck.backend.model.classroom.dto.ClassroomCreateDTO;
import com.eaduck.backend.model.user.dto.UserDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.HashMap;

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
    public ResponseEntity<List<ClassroomDTO>> getAllClassrooms(Authentication authentication) {
        List<Classroom> classrooms;
        Optional<User> userOpt = userRepository.findByEmail(authentication.getName());
        if (userOpt.isPresent() && userOpt.get().getRole().name().equals("TEACHER")) {
            classrooms = userOpt.get().getClassroomsAsTeacher().stream().toList();
        } else {
            classrooms = classroomRepository.findAll();
        }
        List<ClassroomDTO> dtos = classrooms.stream().map(classroom -> {
            List<Long> teacherIds = classroom.getTeachers().stream().map(User::getId).toList();
            List<String> teacherNames = classroom.getTeachers().stream().map(User::getEmail).toList();
            return ClassroomDTO.builder()
                .id(classroom.getId())
                .name(classroom.getName())
                .academicYear(classroom.getAcademicYear())
                .teacherIds(teacherIds)
                .teacherNames(teacherNames)
                .studentCount(classroom.getStudents() != null ? classroom.getStudents().size() : 0)
                .build();
        }).toList();
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/{classroomId}/assign-teacher/{teacherId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignTeacher(@PathVariable Long classroomId, @PathVariable Long teacherId) {
        Optional<Classroom> classroomOpt = classroomRepository.findById(classroomId);
        Optional<User> teacherOpt = userRepository.findById(teacherId);

        if (!classroomOpt.isPresent()) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Turma não encontrada."));
        }
        if (!teacherOpt.isPresent() || !teacherOpt.get().getRole().name().equals("TEACHER")) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Professor não encontrado ou inválido."));
        }

        Classroom classroom = classroomOpt.get();
        classroom.getTeachers().add(teacherOpt.get());
        classroomRepository.save(classroom);

        // Notificar alunos da turma
        String message = "Novo professor atribuído à turma: " + classroom.getName();
        notificationService.notifyClassroom(classroomId, null, message, "TEACHER_ASSIGNED");

        return ResponseEntity.ok(Collections.singletonMap("message", "Professor atribuído com sucesso."));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClassroomDTO> createClassroom(@RequestBody ClassroomCreateDTO dto) {
        Classroom classroom = new Classroom();
        classroom.setName(dto.getName());
        classroom.setAcademicYear(dto.getAcademicYear());
        classroom.setCreatedAt(java.time.LocalDateTime.now());
        // Associar professores se teacherIds vierem preenchidos
        if (dto.getTeacherIds() != null && !dto.getTeacherIds().isEmpty()) {
            Set<User> teachers = new HashSet<>();
            for (Long teacherId : dto.getTeacherIds()) {
                userRepository.findById(teacherId).ifPresent(teachers::add);
            }
            classroom.setTeachers(teachers);
        }
        Classroom saved = classroomRepository.save(classroom);
        ClassroomDTO response = ClassroomDTO.builder()
            .id(saved.getId())
            .name(saved.getName())
            .academicYear(saved.getAcademicYear())
            .teacherIds(saved.getTeachers().stream().map(User::getId).toList())
            .teacherNames(saved.getTeachers().stream().map(User::getEmail).toList())
            .studentCount(saved.getStudents() != null ? saved.getStudents().size() : 0)
            .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClassroomDTO> updateClassroom(@PathVariable Long id, @RequestBody ClassroomCreateDTO dto) {
        Optional<Classroom> classroomOpt = classroomRepository.findById(id);
        if (classroomOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Classroom existing = classroomOpt.get();
        existing.setName(dto.getName());
        existing.setAcademicYear(dto.getAcademicYear());
        // Atualizar professores se teacherIds vierem preenchidos
        if (dto.getTeacherIds() != null) {
            Set<User> teachers = new HashSet<>();
            for (Long teacherId : dto.getTeacherIds()) {
                userRepository.findById(teacherId).ifPresent(teachers::add);
            }
            existing.setTeachers(teachers);
        }
        Classroom updated = classroomRepository.save(existing);
        ClassroomDTO response = ClassroomDTO.builder()
            .id(updated.getId())
            .name(updated.getName())
            .academicYear(updated.getAcademicYear())
            .teacherIds(updated.getTeachers().stream().map(User::getId).toList())
            .teacherNames(updated.getTeachers().stream().map(User::getEmail).toList())
            .studentCount(updated.getStudents() != null ? updated.getStudents().size() : 0)
            .build();
        return ResponseEntity.ok(response);
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
        List<UserDTO> teacherDTOs = classroom.getTeachers().stream()
            .map(user -> UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.isActive())
                .build())
            .toList();
        List<UserDTO> studentDTOs = classroom.getStudents().stream()
            .map(user -> UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.isActive())
                .build())
            .toList();
        return ResponseEntity.ok(new java.util.HashMap<>() {{
            put("teachers", teacherDTOs);
            put("students", studentDTOs);
        }});
    }

    @PostMapping("/{classroomId}/add-teacher/{teacherId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addTeacherToClassroom(@PathVariable Long classroomId, @PathVariable Long teacherId) {
        Optional<Classroom> classroomOpt = classroomRepository.findById(classroomId);
        Optional<User> teacherOpt = userRepository.findById(teacherId);

        if (classroomOpt.isEmpty() || teacherOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Turma ou professor não encontrado."));
        }
        User teacher = teacherOpt.get();
        if (!teacher.getRole().name().equals("TEACHER")) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Usuário não é professor."));
        }
        Classroom classroom = classroomOpt.get();
        classroom.getTeachers().add(teacher);
        classroomRepository.save(classroom);
        return ResponseEntity.ok(Collections.singletonMap("message", "Professor adicionado à turma."));
    }

    @DeleteMapping("/{classroomId}/remove-teacher/{teacherId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> removeTeacherFromClassroom(@PathVariable Long classroomId, @PathVariable Long teacherId) {
        Optional<Classroom> classroomOpt = classroomRepository.findById(classroomId);
        Optional<User> teacherOpt = userRepository.findById(teacherId);

        if (classroomOpt.isEmpty() || teacherOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Turma ou professor não encontrado."));
        }
        Classroom classroom = classroomOpt.get();
        User teacher = teacherOpt.get();
        classroom.getTeachers().remove(teacher);
        classroomRepository.save(classroom);
        return ResponseEntity.ok(Collections.singletonMap("message", "Professor removido da turma."));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> getClassroom(@PathVariable Long id) {
        Optional<Classroom> classroomOpt = classroomRepository.findById(id);
        if (classroomOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Classroom classroom = classroomOpt.get();
        HashMap<String, Object> response = new HashMap<>();
        response.put("id", classroom.getId());
        response.put("name", classroom.getName());
        response.put("academicYear", classroom.getAcademicYear());
        response.put("teachers", classroom.getTeachers());
        response.put("students", classroom.getStudents());
        response.put("createdAt", classroom.getCreatedAt());
        return ResponseEntity.ok(response);
    }
}