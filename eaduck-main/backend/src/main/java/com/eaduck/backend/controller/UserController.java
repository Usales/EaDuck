package com.eaduck.backend.controller;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.enums.Role;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.model.auth.dto.UserRegisterDTO;
import com.eaduck.backend.model.user.dto.UserDTO;
import com.eaduck.backend.model.classroom.dto.ClassroomSimpleDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private UserDTO toDTO(User user) {
        return UserDTO.builder()
            .id(user.getId())
            .email(user.getEmail())
            .role(user.getRole())
            .isActive(user.isActive())
            .build();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(@RequestBody UserRegisterDTO request) {
        try {
            if (request.getEmail() == null || request.getPassword() == null || 
                request.getEmail().isEmpty() || request.getPassword().isEmpty()) {
                return ResponseEntity.badRequest().body("E-mail e senha são obrigatórios.");
            }
            
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                return ResponseEntity.badRequest().body("E-mail já cadastrado.");
            }

            User user = User.builder()
                    .email(request.getEmail())
                    .password(passwordEncoder.encode(request.getPassword()))
                    .role(request.getRole() != null ? request.getRole() : Role.STUDENT)
                    .isActive(true)
                    .name(request.getEmail().split("@")[0].replaceAll("\\d", ""))
                    .build();

            user = userRepository.save(user);
            return ResponseEntity.ok(toDTO(user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erro ao criar usuário: " + e.getMessage());
        }
    }

    @GetMapping("/me/classrooms")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ClassroomSimpleDTO>> getUserClassrooms(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            List<ClassroomSimpleDTO> dtos = userOpt.get().getClassrooms().stream()
                .map(c -> ClassroomSimpleDTO.builder()
                    .id(c.getId())
                    .name(c.getName())
                    .academicYear(c.getAcademicYear())
                    .studentCount(c.getStudents() != null ? c.getStudents().size() : 0)
                    .teacherNames(c.getTeachers().stream().map(t -> t.getEmail()).toList())
                    .build())
                .toList();
            return ResponseEntity.ok(dtos);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDTO>> getUsersByRole(@RequestParam String role) {
        try {
            Role roleEnum = Role.valueOf(role.toUpperCase());
            List<UserDTO> dtos = userRepository.findByRole(roleEnum).stream().map(this::toDTO).toList();
            return ResponseEntity.ok(dtos);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<UserDTO> dtos = userRepository.findAll().stream().map(this::toDTO).toList();
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> updateUserRole(@PathVariable Long id, @RequestParam String role, Authentication authentication) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User userToUpdate = userOpt.get();

        // Pega o usuário autenticado
        User currentUser = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(403).build();
        }

        // Regra: só o admin master (id=1) pode alterar outros admins (exceto ele mesmo)
        if (userToUpdate.getRole() == Role.ADMIN) {
            if (!currentUser.getId().equals(1L)) {
                // Se não for o admin master, não pode alterar outro admin
                return ResponseEntity.status(403).body(null);
            }
            if (userToUpdate.getId().equals(1L)) {
                // Nem o admin master pode alterar ele mesmo
                return ResponseEntity.status(403).body(null);
            }
        }

        try {
            Role newRole = Role.valueOf(role.toUpperCase());
            userToUpdate.setRole(newRole);
            userRepository.save(userToUpdate);
            return ResponseEntity.ok(toDTO(userToUpdate));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Retornar apenas dados essenciais
            return ResponseEntity.ok(new java.util.HashMap<>() {{
                put("id", user.getId());
                put("email", user.getEmail());
                put("role", user.getRole());
                put("isActive", user.isActive());
            }});
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUserStatus(@PathVariable Long id, @RequestParam boolean isActive, Authentication authentication) {
        try {
            Optional<User> userOpt = userRepository.findById(id);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            User userToUpdate = userOpt.get();

            // Pega o usuário autenticado
            User currentUser = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (currentUser == null) {
                return ResponseEntity.status(403).build();
            }

            // Regra: só o admin master (id=1) pode alterar outros admins (exceto ele mesmo)
            if (userToUpdate.getRole() == Role.ADMIN) {
                if (!currentUser.getId().equals(1L)) {
                    // Se não for o admin master, não pode alterar outro admin
                    return ResponseEntity.status(403).body(null);
                }
                if (userToUpdate.getId().equals(1L)) {
                    // Nem o admin master pode alterar ele mesmo
                    return ResponseEntity.status(403).body(null);
                }
            }

            userToUpdate.setActive(isActive);
            userRepository.save(userToUpdate);
            return ResponseEntity.ok(toDTO(userToUpdate));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erro ao atualizar status do usuário: " + e.getMessage());
        }
    }
}