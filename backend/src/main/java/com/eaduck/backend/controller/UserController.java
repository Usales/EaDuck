package com.eaduck.backend.controller;

import com.eaduck.backend.model.enums.Role;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.model.auth.dto.UserRegisterDTO;
import com.eaduck.backend.model.auth.dto.ResponseMessage;
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
import java.io.ByteArrayOutputStream;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;

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
            .name(user.getName())
            .nomeCompleto(user.getNomeCompleto())
            .cpf(user.getCpf())
            .dataNascimento(user.getDataNascimento())
            .nomeMae(user.getNomeMae())
            .nomePai(user.getNomePai())
            .telefone(user.getTelefone())
            .endereco(user.getEndereco())
            .titulacao(user.getTitulacao())
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
                return ResponseEntity.badRequest().body(new ResponseMessage("E-mail e senha são obrigatórios."));
            }
            
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                return ResponseEntity.badRequest().body(new ResponseMessage("E-mail já cadastrado."));
            }

            User user = User.builder()
                    .email(request.getEmail())
                    .password(passwordEncoder.encode(request.getPassword()))
                    .role(request.getRole() != null ? request.getRole() : Role.STUDENT)
                    .isActive(true)
                    .name(null) // Deixar nome como null para forçar setup no primeiro login
                    .nomeCompleto(null)
                    .cpf(null)
                    .dataNascimento(null)
                    .nomeMae(null)
                    .nomePai(null)
                    .telefone(null)
                    .endereco(null)
                    .titulacao(null)
                    .build();

            user = userRepository.save(user);
            logger.info("Usuário criado com sucesso: {}", user.getEmail());
            return ResponseEntity.ok(toDTO(user));
        } catch (Exception e) {
            logger.error("Erro ao criar usuário: ", e);
            return ResponseEntity.badRequest().body(new ResponseMessage("Erro ao criar usuário: " + e.getMessage()));
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
            
            // Para ADMIN, verificar se nomeCompleto, CPF e endereço estão preenchidos
            // Para TEACHER, verificar se nomeCompleto, CPF, endereço e titulação estão preenchidos
            boolean needsNameSetup;
            if (user.getRole() == Role.ADMIN) {
                needsNameSetup = user.getNomeCompleto() == null || user.getNomeCompleto().trim().isEmpty() ||
                                 user.getCpf() == null || user.getCpf().trim().isEmpty() ||
                                 user.getEndereco() == null || user.getEndereco().trim().isEmpty();
            } else if (user.getRole() == Role.TEACHER) {
                needsNameSetup = user.getNomeCompleto() == null || user.getNomeCompleto().trim().isEmpty() ||
                                 user.getCpf() == null || user.getCpf().trim().isEmpty() ||
                                 user.getEndereco() == null || user.getEndereco().trim().isEmpty() ||
                                 user.getTitulacao() == null || user.getTitulacao().trim().isEmpty();
            } else if (user.getRole() == Role.STUDENT) {
                // Para STUDENT, verificar todos os campos obrigatórios
                needsNameSetup = user.getName() == null || user.getName().trim().isEmpty() ||
                                 user.getNomeCompleto() == null || user.getNomeCompleto().trim().isEmpty() ||
                                 user.getCpf() == null || user.getCpf().trim().isEmpty() ||
                                 user.getDataNascimento() == null || user.getDataNascimento().trim().isEmpty() ||
                                 user.getNomeMae() == null || user.getNomeMae().trim().isEmpty() ||
                                 user.getNomePai() == null || user.getNomePai().trim().isEmpty() ||
                                 user.getTelefone() == null || user.getTelefone().trim().isEmpty() ||
                                 user.getEndereco() == null || user.getEndereco().trim().isEmpty();
            } else {
                // Para outros tipos de usuários, verificar apenas o nome
                needsNameSetup = user.getName() == null || user.getName().trim().isEmpty();
            }
            
            // Retornar apenas dados essenciais
            return ResponseEntity.ok(new java.util.HashMap<>() {{
                put("id", user.getId());
                put("email", user.getEmail());
                put("name", user.getName());
                put("role", user.getRole());
                put("isActive", user.isActive());
                put("needsNameSetup", needsNameSetup);
                put("nomeCompleto", user.getNomeCompleto());
                put("cpf", user.getCpf());
                put("endereco", user.getEndereco());
                put("titulacao", user.getTitulacao());
                put("dataNascimento", user.getDataNascimento());
                put("nomeMae", user.getNomeMae());
                put("nomePai", user.getNomePai());
                put("telefone", user.getTelefone());
            }});
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/me/name")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateUserName(@RequestBody Map<String, String> request, Authentication authentication) {
        logger.info("=== UPDATE USER DATA ENDPOINT CALLED ===");
        logger.info("Request body: {}", request);
        String email = authentication.getName();
        logger.info("User email: {}", email);
        Optional<User> userOpt = userRepository.findByEmail(email);
        
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        User user = userOpt.get();
        
        // Atualizar nickname/apelido (name)
        String newName = request.get("name");
        if (newName != null && !newName.trim().isEmpty()) {
            user.setName(newName.trim());
        }
        
        // Atualizar nome completo
        String nomeCompleto = request.get("nomeCompleto");
        if (nomeCompleto != null && !nomeCompleto.trim().isEmpty()) {
            user.setNomeCompleto(nomeCompleto.trim());
        }
        
        // Atualizar CPF
        String cpf = request.get("cpf");
        if (cpf != null && !cpf.trim().isEmpty()) {
            user.setCpf(cpf.trim());
        }
        
        // Atualizar data de nascimento
        String dataNascimento = request.get("dataNascimento");
        if (dataNascimento != null && !dataNascimento.trim().isEmpty()) {
            user.setDataNascimento(dataNascimento.trim());
        }
        
        // Atualizar nome da mãe
        String nomeMae = request.get("nomeMae");
        if (nomeMae != null && !nomeMae.trim().isEmpty()) {
            user.setNomeMae(nomeMae.trim());
        }
        
        // Atualizar nome do pai
        String nomePai = request.get("nomePai");
        if (nomePai != null && !nomePai.trim().isEmpty()) {
            user.setNomePai(nomePai.trim());
        }
        
        // Atualizar telefone
        String telefone = request.get("telefone");
        if (telefone != null && !telefone.trim().isEmpty()) {
            user.setTelefone(telefone.trim());
        }
        
        // Atualizar endereço
        String endereco = request.get("endereco");
        if (endereco != null && !endereco.trim().isEmpty()) {
            user.setEndereco(endereco.trim());
        }
        
        // Atualizar titulação (para professores)
        String titulacao = request.get("titulacao");
        if (titulacao != null && !titulacao.trim().isEmpty()) {
            user.setTitulacao(titulacao.trim());
        }
        
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of(
            "message", "Dados atualizados com sucesso",
            "name", user.getName() != null ? user.getName() : "",
            "nomeCompleto", user.getNomeCompleto() != null ? user.getNomeCompleto() : ""
        ));
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
                .map(this::toDTO)
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
                .map(this::toDTO)
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

    @GetMapping("/export/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<?> exportUsersToPdf() {
        try {
            List<User> users = userRepository.findAll();
            
            // Separar usuários por tipo
            List<User> students = users.stream().filter(u -> u.getRole() == Role.STUDENT).collect(java.util.stream.Collectors.toList());
            List<User> nonStudents = users.stream().filter(u -> u.getRole() != Role.STUDENT).collect(java.util.stream.Collectors.toList());
            
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            // Configurar página em modo landscape (horizontal)
            Document document = new Document(pdf, PageSize.A4.rotate());

            // Título
            Paragraph title = new Paragraph("Relatório de Usuários - EaDuck")
                    .setFontSize(18)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(title);

            // Data de geração
            Paragraph date = new Paragraph("Data de geração: " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")))
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(date);

            // Tabela para ALUNOS (sem APELIDO e TITULAÇÃO)
            if (!students.isEmpty()) {
                Paragraph studentsTitle = new Paragraph("ALUNOS")
                        .setFontSize(14)
                        .setBold()
                        .setMarginBottom(10);
                document.add(studentsTitle);
                
                UnitValue[] studentColumnWidths = {
                    UnitValue.createPointValue(20),   // ID
                    UnitValue.createPointValue(80),   // E-MAIL
                    UnitValue.createPointValue(80),   // NOME COMPLETO
                    UnitValue.createPointValue(60),   // CPF
                    UnitValue.createPointValue(50),   // DATA NASC.
                    UnitValue.createPointValue(60),   // NOME MÃE
                    UnitValue.createPointValue(60),   // NOME PAI
                    UnitValue.createPointValue(65),   // TELEFONE
                    UnitValue.createPointValue(100), // ENDEREÇO
                    UnitValue.createPointValue(35),  // STATUS
                };
                Table studentTable = new Table(studentColumnWidths);
                studentTable.setWidth(UnitValue.createPercentValue(100));
                
                // Cabeçalho da tabela de alunos
                studentTable.addHeaderCell(new Cell().add(new Paragraph("ID").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                studentTable.addHeaderCell(new Cell().add(new Paragraph("E-MAIL").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                studentTable.addHeaderCell(new Cell().add(new Paragraph("NOME COMPLETO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                studentTable.addHeaderCell(new Cell().add(new Paragraph("CPF").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                studentTable.addHeaderCell(new Cell().add(new Paragraph("DATA NASC.").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                studentTable.addHeaderCell(new Cell().add(new Paragraph("NOME MÃE").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                studentTable.addHeaderCell(new Cell().add(new Paragraph("NOME PAI").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                studentTable.addHeaderCell(new Cell().add(new Paragraph("TELEFONE").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                studentTable.addHeaderCell(new Cell().add(new Paragraph("ENDEREÇO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                studentTable.addHeaderCell(new Cell().add(new Paragraph("STATUS").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));

                // Dados dos alunos
                for (User user : students) {
                    studentTable.addCell(new Cell().add(new Paragraph(String.valueOf(user.getId()))).setFontSize(6).setPadding(3));
                    
                    String email = user.getEmail() != null ? user.getEmail() : "-";
                    if (!email.equals("-") && email.length() > 30) {
                        email = email.substring(0, 27) + "...";
                    }
                    studentTable.addCell(new Cell().add(new Paragraph(email)).setFontSize(6).setPadding(3));
                    
                    String nomeCompleto = user.getNomeCompleto() != null ? (user.getNomeCompleto().length() > 20 ? user.getNomeCompleto().substring(0, 20) + "..." : user.getNomeCompleto()) : "-";
                    studentTable.addCell(new Cell().add(new Paragraph(nomeCompleto)).setFontSize(6).setPadding(3));
                    
                    studentTable.addCell(new Cell().add(new Paragraph(user.getCpf() != null ? user.getCpf() : "-")).setFontSize(6).setPadding(3));
                    studentTable.addCell(new Cell().add(new Paragraph(user.getDataNascimento() != null ? user.getDataNascimento() : "-")).setFontSize(6).setPadding(3));
                    
                    String nomeMae = user.getNomeMae() != null ? (user.getNomeMae().length() > 15 ? user.getNomeMae().substring(0, 15) + "..." : user.getNomeMae()) : "-";
                    studentTable.addCell(new Cell().add(new Paragraph(nomeMae)).setFontSize(6).setPadding(3));
                    
                    String nomePai = user.getNomePai() != null ? (user.getNomePai().length() > 15 ? user.getNomePai().substring(0, 15) + "..." : user.getNomePai()) : "-";
                    studentTable.addCell(new Cell().add(new Paragraph(nomePai)).setFontSize(6).setPadding(3));
                    
                    studentTable.addCell(new Cell().add(new Paragraph(user.getTelefone() != null ? user.getTelefone() : "-")).setFontSize(6).setPadding(3));
                    
                    String endereco = user.getEndereco() != null ? (user.getEndereco().length() > 25 ? user.getEndereco().substring(0, 25) + "..." : user.getEndereco()) : "-";
                    studentTable.addCell(new Cell().add(new Paragraph(endereco)).setFontSize(6).setPadding(3));
                    
                    String statusLabel = user.isActive() ? "Ativo" : "Inativo";
                    studentTable.addCell(new Cell().add(new Paragraph(statusLabel)).setFontSize(6).setPadding(3));
                }

                document.add(studentTable);
                document.add(new Paragraph(" ").setMarginBottom(15)); // Espaço entre tabelas
            }

            // Tabela para PROFESSORES e ADMINS (com APELIDO e TITULAÇÃO)
            if (!nonStudents.isEmpty()) {
                Paragraph nonStudentsTitle = new Paragraph("PROFESSORES E ADMINISTRADORES")
                        .setFontSize(14)
                        .setBold()
                        .setMarginBottom(10);
                document.add(nonStudentsTitle);
                
                UnitValue[] nonStudentColumnWidths = {
                    UnitValue.createPointValue(20),   // ID
                    UnitValue.createPointValue(70),   // E-MAIL
                    UnitValue.createPointValue(40),   // APELIDO
                    UnitValue.createPointValue(70),   // NOME COMPLETO
                    UnitValue.createPointValue(55),   // CPF
                    UnitValue.createPointValue(85),   // ENDEREÇO
                    UnitValue.createPointValue(70),   // TITULAÇÃO
                    UnitValue.createPointValue(35),   // TIPO
                    UnitValue.createPointValue(30)    // STATUS
                };
                Table nonStudentTable = new Table(nonStudentColumnWidths);
                nonStudentTable.setWidth(UnitValue.createPercentValue(100));
                
                // Cabeçalho da tabela de professores/admins
                nonStudentTable.addHeaderCell(new Cell().add(new Paragraph("ID").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                nonStudentTable.addHeaderCell(new Cell().add(new Paragraph("E-MAIL").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                nonStudentTable.addHeaderCell(new Cell().add(new Paragraph("APELIDO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                nonStudentTable.addHeaderCell(new Cell().add(new Paragraph("NOME COMPLETO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                nonStudentTable.addHeaderCell(new Cell().add(new Paragraph("CPF").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                nonStudentTable.addHeaderCell(new Cell().add(new Paragraph("ENDEREÇO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                nonStudentTable.addHeaderCell(new Cell().add(new Paragraph("TITULAÇÃO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                nonStudentTable.addHeaderCell(new Cell().add(new Paragraph("TIPO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                nonStudentTable.addHeaderCell(new Cell().add(new Paragraph("STATUS").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));

                // Dados dos professores e admins
                for (User user : nonStudents) {
                    nonStudentTable.addCell(new Cell().add(new Paragraph(String.valueOf(user.getId()))).setFontSize(6).setPadding(3));
                    
                    String email = user.getEmail() != null ? user.getEmail() : "-";
                    if (!email.equals("-") && email.length() > 30) {
                        email = email.substring(0, 27) + "...";
                    }
                    nonStudentTable.addCell(new Cell().add(new Paragraph(email)).setFontSize(6).setPadding(3));
                    
                    String apelido = user.getName() != null ? (user.getName().length() > 12 ? user.getName().substring(0, 12) + "..." : user.getName()) : "-";
                    nonStudentTable.addCell(new Cell().add(new Paragraph(apelido)).setFontSize(6).setPadding(3));
                    
                    String nomeCompleto = user.getNomeCompleto() != null ? (user.getNomeCompleto().length() > 18 ? user.getNomeCompleto().substring(0, 18) + "..." : user.getNomeCompleto()) : "-";
                    nonStudentTable.addCell(new Cell().add(new Paragraph(nomeCompleto)).setFontSize(6).setPadding(3));
                    
                    nonStudentTable.addCell(new Cell().add(new Paragraph(user.getCpf() != null ? user.getCpf() : "-")).setFontSize(6).setPadding(3));
                    
                    String endereco = user.getEndereco() != null ? (user.getEndereco().length() > 20 ? user.getEndereco().substring(0, 20) + "..." : user.getEndereco()) : "-";
                    nonStudentTable.addCell(new Cell().add(new Paragraph(endereco)).setFontSize(6).setPadding(3));
                    
                    String titulacao = user.getTitulacao() != null ? (user.getTitulacao().length() > 18 ? user.getTitulacao().substring(0, 18) + "..." : user.getTitulacao()) : "-";
                    nonStudentTable.addCell(new Cell().add(new Paragraph(titulacao)).setFontSize(6).setPadding(3));
                    
                    String roleLabel = switch (user.getRole()) {
                        case ADMIN -> "Admin";
                        case TEACHER -> "Prof.";
                        default -> user.getRole().toString();
                    };
                    nonStudentTable.addCell(new Cell().add(new Paragraph(roleLabel)).setFontSize(6).setPadding(3));
                    
                    String statusLabel = user.isActive() ? "Ativo" : "Inativo";
                    nonStudentTable.addCell(new Cell().add(new Paragraph(statusLabel)).setFontSize(6).setPadding(3));
                }

                document.add(nonStudentTable);
            }

            document.close();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "usuarios_eaduck.pdf");
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

            return new ResponseEntity<>(baos.toByteArray(), headers, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Erro ao gerar PDF de usuários: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Erro ao gerar PDF: " + e.getMessage());
        }
    }
}