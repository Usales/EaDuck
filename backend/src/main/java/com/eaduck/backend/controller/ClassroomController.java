package com.eaduck.backend.controller;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.ClassroomRepository;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.service.NotificationService;
import com.eaduck.backend.model.classroom.dto.ClassroomDTO;
import com.eaduck.backend.model.classroom.dto.ClassroomCreateDTO;
import com.eaduck.backend.model.user.dto.UserDTO;
import com.eaduck.backend.model.enums.Role;
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
import java.util.ArrayList;
import com.eaduck.backend.model.classroom.dto.ClassroomSimpleDTO;
import com.eaduck.backend.model.classroom.dto.ClassroomDashboardDTO;

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
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ClassroomDTO>> getAllClassrooms(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        List<Classroom> classrooms;
        if (user.getRole() == Role.ADMIN) {
            classrooms = classroomRepository.findAll();
        } else if (user.getRole() == Role.TEACHER) {
            classrooms = new ArrayList<>(user.getClassroomsAsTeacher());
        } else {
            classrooms = new ArrayList<>(user.getClassrooms());
        }
        // Retorna DTO completo para cada sala, garantindo nomes nunca nulos
        List<ClassroomDTO> dtos = classrooms.stream().map(classroom -> ClassroomDTO.builder()
            .id(classroom.getId())
            .name(classroom.getName())
            .academicYear(classroom.getAcademicYear())
            .teacherIds(classroom.getTeachers().stream().map(User::getId).toList())
            .teacherNames(classroom.getTeachers().stream().map(u -> u.getEmail() != null ? u.getEmail() : "").toList())
            .studentIds(classroom.getStudents().stream().map(User::getId).toList())
            .studentNames(classroom.getStudents().stream().map(u -> u.getEmail() != null ? u.getEmail() : "").toList())
            .studentCount(classroom.getStudents() != null ? classroom.getStudents().size() : 0)
            .active(classroom.getStudents() != null && !classroom.getStudents().isEmpty())
            .build()).toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ClassroomDTO> getClassroomById(@PathVariable Long id, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        Classroom classroom = classroomRepository.findById(id).orElse(null);
        if (classroom == null) {
            return ResponseEntity.notFound().build();
        }

        // Verifica se o usuário tem acesso à sala
        boolean hasAccess = false;
        if (user.getRole() == Role.ADMIN) {
            hasAccess = true;
        } else if (user.getRole() == Role.TEACHER) {
            hasAccess = user.getClassroomsAsTeacher().contains(classroom);
        } else {
            hasAccess = user.getClassrooms().contains(classroom);
        }

        if (!hasAccess) {
            return ResponseEntity.status(403).build();
        }

        ClassroomDTO dto = ClassroomDTO.builder()
            .id(classroom.getId())
            .name(classroom.getName())
            .academicYear(classroom.getAcademicYear())
            .teacherIds(classroom.getTeachers().stream().map(User::getId).toList())
            .teacherNames(classroom.getTeachers().stream().map(User::getEmail).toList())
            .studentIds(classroom.getStudents().stream().map(User::getId).toList())
            .studentNames(classroom.getStudents().stream().map(User::getEmail).toList())
            .studentCount(classroom.getStudents() != null ? classroom.getStudents().size() : 0)
            .active(classroom.getStudents() != null && !classroom.getStudents().isEmpty())
            .build();
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<ClassroomDTO> createClassroom(@RequestBody ClassroomCreateDTO dto, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        Classroom classroom = new Classroom();
        classroom.setName(dto.getName());
        classroom.setAcademicYear(dto.getAcademicYear());
        classroom.setCreatedAt(java.time.LocalDateTime.now());

        // Se for professor, adiciona ele mesmo como professor da sala
        if (user.getRole() == Role.TEACHER) {
            classroom.getTeachers().add(user);
        }

        // Associar professores se teacherIds vierem preenchidos
        if (dto.getTeacherIds() != null && !dto.getTeacherIds().isEmpty()) {
            Set<User> teachers = new HashSet<>();
            for (Long teacherId : dto.getTeacherIds()) {
                userRepository.findById(teacherId).ifPresent(teachers::add);
            }
            classroom.getTeachers().addAll(teachers);
        }

        Classroom saved = classroomRepository.save(classroom);
        ClassroomDTO response = ClassroomDTO.builder()
            .id(saved.getId())
            .name(saved.getName())
            .academicYear(saved.getAcademicYear())
            .teacherIds(saved.getTeachers().stream().map(User::getId).toList())
            .teacherNames(saved.getTeachers().stream().map(User::getEmail).toList())
            .studentIds(saved.getStudents().stream().map(User::getId).toList())
            .studentNames(saved.getStudents().stream().map(User::getEmail).toList())
            .studentCount(saved.getStudents() != null ? saved.getStudents().size() : 0)
            .active(saved.getStudents() != null && !saved.getStudents().isEmpty())
            .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<ClassroomDTO> updateClassroom(@PathVariable Long id, @RequestBody ClassroomCreateDTO dto, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        Optional<Classroom> classroomOpt = classroomRepository.findById(id);
        if (classroomOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Classroom existing = classroomOpt.get();

        // Verifica se o professor tem acesso à sala
        if (user.getRole() == Role.TEACHER) {
            boolean hasAccess = user.getClassroomsAsTeacher().contains(existing);
            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }
        }

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
            .studentIds(updated.getStudents().stream().map(User::getId).toList())
            .studentNames(updated.getStudents().stream().map(User::getEmail).toList())
            .studentCount(updated.getStudents() != null ? updated.getStudents().size() : 0)
            .active(updated.getStudents() != null && !updated.getStudents().isEmpty())
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

    @PostMapping("/{id}/students/{studentId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> addStudentToClassroom(@PathVariable Long id, @PathVariable Long studentId, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        Classroom classroom = classroomRepository.findById(id).orElse(null);
        if (classroom == null) {
            return ResponseEntity.notFound().build();
        }

        // Verifica se o professor tem acesso à sala
        if (user.getRole() == Role.TEACHER) {
            boolean hasAccess = user.getClassroomsAsTeacher().contains(classroom);
            if (!hasAccess) {
                return ResponseEntity.status(403).build();
        }
        }

        User student = userRepository.findById(studentId).orElse(null);
        if (student == null || student.getRole() != Role.STUDENT) {
            return ResponseEntity.badRequest().build();
        }

        classroom.getStudents().add(student);
        classroomRepository.save(classroom);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/students/{studentId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> removeStudentFromClassroom(@PathVariable Long id, @PathVariable Long studentId, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        Classroom classroom = classroomRepository.findById(id).orElse(null);
        if (classroom == null) {
            return ResponseEntity.notFound().build();
        }

        // Verifica se o professor tem acesso à sala
        if (user.getRole() == Role.TEACHER) {
            boolean hasAccess = user.getClassroomsAsTeacher().contains(classroom);
            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }
        }

        User student = userRepository.findById(studentId).orElse(null);
        if (student == null) {
            return ResponseEntity.badRequest().build();
        }

        classroom.getStudents().remove(student);
        classroomRepository.save(classroom);
        return ResponseEntity.ok().build();
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

    @PostMapping("/{id}/assign-teacher/{teacherId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addTeacherToClassroom(@PathVariable Long id, @PathVariable Long teacherId) {
        Classroom classroom = classroomRepository.findById(id).orElse(null);
        if (classroom == null) {
            return ResponseEntity.notFound().build();
        }

        User teacher = userRepository.findById(teacherId).orElse(null);
        if (teacher == null || teacher.getRole() != Role.TEACHER) {
            return ResponseEntity.badRequest().build();
        }

        classroom.getTeachers().add(teacher);
        classroomRepository.save(classroom);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/remove-teacher/{teacherId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> removeTeacherFromClassroom(@PathVariable Long id, @PathVariable Long teacherId) {
        Classroom classroom = classroomRepository.findById(id).orElse(null);
        if (classroom == null) {
            return ResponseEntity.notFound().build();
        }

        User teacher = userRepository.findById(teacherId).orElse(null);
        if (teacher == null || teacher.getRole() != Role.TEACHER) {
            return ResponseEntity.badRequest().build();
        }

        classroom.getTeachers().remove(teacher);
        classroomRepository.save(classroom);
        return ResponseEntity.ok().build();
    }
}