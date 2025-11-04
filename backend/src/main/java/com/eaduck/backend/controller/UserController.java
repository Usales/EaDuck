package com.eaduck.backend.controller;

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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

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
                    .name(null) // Deixar nome como null para forçar setup no primeiro login
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
                    .teacherNames(c.getTeachers().stream().map(t -> t.getName() != null ? t.getName() : t.getEmail()).toList())
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
                put("name", user.getName());
                put("role", user.getRole());
                put("isActive", user.isActive());
                put("needsNameSetup", user.getName() == null || user.getName().trim().isEmpty());
            }});
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/me/name")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateUserName(@RequestBody Map<String, String> request, Authentication authentication) {
        logger.info("=== UPDATE USER NAME ENDPOINT CALLED ===");
        logger.info("Request body: {}", request);
        String email = authentication.getName();
        logger.info("User email: {}", email);
        Optional<User> userOpt = userRepository.findByEmail(email);
        
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        String newName = request.get("name");
        if (newName == null || newName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nome é obrigatório"));
        }
        
        User user = userOpt.get();
        user.setName(newName.trim());
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("message", "Nome atualizado com sucesso", "name", user.getName()));
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, Authentication authentication) {
        try {
            Optional<User> userOpt = userRepository.findById(id);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            User userToDelete = userOpt.get();

            // Pega o usuário autenticado
            User currentUser = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (currentUser == null) {
                return ResponseEntity.status(403).build();
            }

            // Regra: só o admin master (id=1) pode deletar outros admins (exceto ele mesmo)
            if (userToDelete.getRole() == Role.ADMIN) {
                if (!currentUser.getId().equals(1L)) {
                    // Se não for o admin master, não pode deletar outro admin
                    return ResponseEntity.status(403).body("Apenas o administrador master pode deletar outros administradores.");
                }
                if (userToDelete.getId().equals(1L)) {
                    // Nem o admin master pode deletar ele mesmo
                    return ResponseEntity.status(403).body("Você não pode deletar sua própria conta.");
                }
            }

            // Verifica se o usuário tem salas de aula associadas
            if (!userToDelete.getClassrooms().isEmpty() || !userToDelete.getClassroomsAsTeacher().isEmpty()) {
                return ResponseEntity.status(409).body("Não é possível deletar o usuário pois ele está associado a salas de aula.");
            }

            userRepository.delete(userToDelete);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erro ao deletar usuário: " + e.getMessage());
        }
    }

    /**
     * Busca todos os professores para seleção em criação de salas
     */
    @GetMapping("/teachers")
    public ResponseEntity<List<UserDTO>> getTeachers() {
        try {
            List<User> teachers = userRepository.findByRole(Role.TEACHER);
            List<UserDTO> teacherDTOs = teachers.stream()
                .map(user -> UserDTO.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .role(user.getRole())
                    .isActive(user.isActive())
                    .build())
                .collect(java.util.stream.Collectors.toList());
            
            return ResponseEntity.ok(teacherDTOs);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    /**
     * Endpoint para obter todos os alunos (STUDENT)
     */
    @GetMapping("/students")
    public ResponseEntity<List<UserDTO>> getStudents() {
        try {
            List<User> students = userRepository.findByRole(Role.STUDENT);
            List<UserDTO> studentDTOs = students.stream()
                .map(user -> UserDTO.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .name(user.getName())
                    .role(user.getRole())
                    .isActive(user.isActive())
                    .build())
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(studentDTOs);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PutMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request, Authentication authentication) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(authentication.getName());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body("Usuário não encontrado");
            }

            User user = userOpt.get();
            String name = request.get("name");
            
            if (name != null && !name.trim().isEmpty()) {
                user.setName(name.trim());
                userRepository.save(user);
                return ResponseEntity.ok(Map.of("message", "Perfil atualizado com sucesso"));
            } else {
                return ResponseEntity.badRequest().body("Nome é obrigatório");
            }
        } catch (Exception e) {
            logger.error("Erro ao atualizar perfil: {}", e.getMessage());
            return ResponseEntity.status(500).body("Erro interno do servidor");
        }
    }

    @PutMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request, Authentication authentication) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(authentication.getName());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body("Usuário não encontrado");
            }

            User user = userOpt.get();
            String currentPassword = request.get("currentPassword");
            String newPassword = request.get("newPassword");

            if (currentPassword == null || newPassword == null) {
                return ResponseEntity.badRequest().body("Senha atual e nova senha são obrigatórias");
            }

            if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                return ResponseEntity.badRequest().body("Senha atual incorreta");
            }

            if (newPassword.length() < 6) {
                return ResponseEntity.badRequest().body("Nova senha deve ter pelo menos 6 caracteres");
            }

            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Senha alterada com sucesso"));
        } catch (Exception e) {
            logger.error("Erro ao alterar senha: {}", e.getMessage());
            return ResponseEntity.status(500).body("Erro interno do servidor");
        }
    }

    @PutMapping("/notification-settings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateNotificationSettings(@RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(authentication.getName());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body("Usuário não encontrado");
            }

            // Por enquanto, apenas retorna sucesso
            // Futuramente, pode ser implementado um sistema de configurações de notificação
            return ResponseEntity.ok(Map.of("message", "Configurações de notificação atualizadas"));
        } catch (Exception e) {
            logger.error("Erro ao atualizar configurações de notificação: {}", e.getMessage());
            return ResponseEntity.status(500).body("Erro interno do servidor");
        }
    }
}