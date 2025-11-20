package com.eaduck.backend.controller;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.ClassroomRepository;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.model.classroom.dto.ClassroomDTO;
import com.eaduck.backend.model.classroom.dto.ClassroomCreateDTO;
import com.eaduck.backend.model.classroom.dto.ClassroomUpdateDTO;
import com.eaduck.backend.model.user.dto.UserDTO;
import com.eaduck.backend.model.enums.Role;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.ArrayList;
import java.io.ByteArrayOutputStream;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.layout.properties.TextAlignment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/classrooms")
public class ClassroomController {

    private static final Logger logger = LoggerFactory.getLogger(ClassroomController.class);

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private UserRepository userRepository;


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
            .teacherNames(classroom.getTeachers().stream().map(u -> u.getName() != null ? u.getName() : u.getEmail()).toList())
            .studentIds(classroom.getStudents().stream().map(User::getId).toList())
            .studentNames(classroom.getStudents().stream().map(u -> u.getName() != null ? u.getName() : u.getEmail()).toList())
            .studentCount(classroom.getStudents() != null ? classroom.getStudents().size() : 0)
            .active(classroom.getStudents() != null && !classroom.getStudents().isEmpty())
            .isActive(classroom.getIsActive() != null ? classroom.getIsActive() : true)
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

        // Verifica se a sala está inativa e se o usuário não é admin
        // Se a sala estiver inativa e o usuário não for admin, bloqueia o acesso
        boolean isActive = classroom.getIsActive() != null ? classroom.getIsActive() : true;
        if (!isActive && user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).body(null);
        }

        ClassroomDTO dto = ClassroomDTO.builder()
            .id(classroom.getId())
            .name(classroom.getName())
            .academicYear(classroom.getAcademicYear())
            .teacherIds(classroom.getTeachers().stream().map(User::getId).toList())
            .teacherNames(classroom.getTeachers().stream().map(u -> u.getName() != null ? u.getName() : u.getEmail()).toList())
            .studentIds(classroom.getStudents().stream().map(User::getId).toList())
            .studentNames(classroom.getStudents().stream().map(u -> u.getName() != null ? u.getName() : u.getEmail()).toList())
            .studentCount(classroom.getStudents() != null ? classroom.getStudents().size() : 0)
            .active(classroom.getStudents() != null && !classroom.getStudents().isEmpty())
            .isActive(isActive)
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
        
        // Se for professor, garantir que o relacionamento está atualizado
        if (user.getRole() == Role.TEACHER) {
            // Recarregar o usuário para garantir que o relacionamento está atualizado
            User updatedUser = userRepository.findById(user.getId()).orElse(null);
            if (updatedUser != null) {
                // Forçar o carregamento do relacionamento
                updatedUser.getClassroomsAsTeacher().size(); // Isso força o carregamento lazy
            }
        }
        
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
    public ResponseEntity<?> updateClassroom(@PathVariable Long id, @RequestBody ClassroomUpdateDTO updateDTO, Authentication authentication) {
        System.out.println("========================================");
        System.out.println("[CLASSROOM-CONTROLLER] ===== INICIANDO ATUALIZAÇÃO DA SALA =====");
        System.out.println("[CLASSROOM-CONTROLLER] Sala ID recebido: " + id);
        System.out.println("[CLASSROOM-CONTROLLER] DTO recebido completo: " + updateDTO);
        System.out.println("[CLASSROOM-CONTROLLER] DTO.isActive recebido: " + updateDTO.getIsActive());
        System.out.println("[CLASSROOM-CONTROLLER] Tipo de isActive: " + (updateDTO.getIsActive() != null ? updateDTO.getIsActive().getClass().getName() : "null"));
        
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            System.out.println("[CLASSROOM-CONTROLLER] ERRO: Usuário não encontrado");
            return ResponseEntity.badRequest().build();
        }

        Classroom classroom = classroomRepository.findById(id).orElse(null);
        if (classroom == null) {
            System.out.println("[CLASSROOM-CONTROLLER] ERRO: Sala não encontrada com ID: " + id);
            return ResponseEntity.notFound().build();
        }

        System.out.println("[CLASSROOM-CONTROLLER] Sala encontrada: " + classroom.getName());
        System.out.println("[CLASSROOM-CONTROLLER] isActive ANTES da atualização: " + classroom.getIsActive());

        // Verifica se o usuário tem permissão para editar a sala
        boolean canEdit = false;
        if (user.getRole() == Role.ADMIN) {
            canEdit = true;
        } else if (user.getRole() == Role.TEACHER) {
            canEdit = user.getClassroomsAsTeacher().contains(classroom);
        }

        if (!canEdit) {
            System.out.println("[CLASSROOM-CONTROLLER] ERRO: Usuário não tem permissão para editar");
            return ResponseEntity.status(403).body("Você não tem permissão para editar esta sala");
        }

        // Atualiza os campos fornecidos
        if (updateDTO.getName() != null && !updateDTO.getName().trim().isEmpty()) {
            System.out.println("[CLASSROOM-CONTROLLER] Atualizando nome: " + updateDTO.getName());
            classroom.setName(updateDTO.getName().trim());
        }
        if (updateDTO.getAcademicYear() != null) {
            System.out.println("[CLASSROOM-CONTROLLER] Atualizando ano acadêmico: " + updateDTO.getAcademicYear());
            classroom.setAcademicYear(updateDTO.getAcademicYear());
        }
        if (updateDTO.getIsActive() != null) {
            System.out.println("[CLASSROOM-CONTROLLER] Atualizando isActive: " + updateDTO.getIsActive());
            classroom.setIsActive(updateDTO.getIsActive());
            System.out.println("[CLASSROOM-CONTROLLER] isActive definido na entidade: " + classroom.getIsActive());
        } else {
            System.out.println("[CLASSROOM-CONTROLLER] ATENÇÃO: isActive é null no DTO, não será atualizado");
        }

        System.out.println("[CLASSROOM-CONTROLLER] Salvando sala no banco de dados...");
        Classroom savedClassroom = classroomRepository.save(classroom);
        System.out.println("[CLASSROOM-CONTROLLER] Sala salva com sucesso");
        System.out.println("[CLASSROOM-CONTROLLER] isActive DEPOIS de salvar: " + savedClassroom.getIsActive());
        
        // Verificar se realmente foi salvo no banco
        Classroom verifyClassroom = classroomRepository.findById(id).orElse(null);
        if (verifyClassroom != null) {
            System.out.println("[CLASSROOM-CONTROLLER] Verificação no banco - isActive: " + verifyClassroom.getIsActive());
        }

        // Retorna o DTO atualizado
        ClassroomDTO dto = ClassroomDTO.builder()
            .id(savedClassroom.getId())
            .name(savedClassroom.getName())
            .academicYear(savedClassroom.getAcademicYear())
            .teacherIds(savedClassroom.getTeachers().stream().map(User::getId).toList())
            .teacherNames(savedClassroom.getTeachers().stream().map(u -> u.getName() != null ? u.getName() : u.getEmail()).toList())
            .studentIds(savedClassroom.getStudents().stream().map(User::getId).toList())
            .studentNames(savedClassroom.getStudents().stream().map(u -> u.getName() != null ? u.getName() : u.getEmail()).toList())
            .studentCount(savedClassroom.getStudents() != null ? savedClassroom.getStudents().size() : 0)
            .active(savedClassroom.getStudents() != null && !savedClassroom.getStudents().isEmpty())
            .isActive(savedClassroom.getIsActive() != null ? savedClassroom.getIsActive() : true)
            .build();

        System.out.println("[CLASSROOM-CONTROLLER] DTO.isActive que será retornado: " + dto.isActive());
        System.out.println("[CLASSROOM-CONTROLLER] ===== ATUALIZAÇÃO CONCLUÍDA ======");
        System.out.println("========================================");

        return ResponseEntity.ok(dto);
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
            logger.warn("Usuário não encontrado ao tentar adicionar aluno à sala");
            return ResponseEntity.badRequest().build();
        }

        Classroom classroom = classroomRepository.findById(id).orElse(null);
        if (classroom == null) {
            logger.warn("Sala não encontrada: {}", id);
            return ResponseEntity.notFound().build();
        }

        // Verifica se o professor tem acesso à sala
        if (user.getRole() == Role.TEACHER) {
            // Verificar se o professor está na lista de professores da sala
            // Isso é mais confiável do que verificar o relacionamento inverso
            boolean hasAccess = classroom.getTeachers().contains(user);
            logger.info("Professor {} tentando adicionar aluno à sala {}. Tem acesso: {}", user.getEmail(), id, hasAccess);
            if (!hasAccess) {
                logger.warn("Professor {} não tem acesso à sala {}", user.getEmail(), id);
                return ResponseEntity.status(403).build();
            }
        }

        User student = userRepository.findById(studentId).orElse(null);
        if (student == null || student.getRole() != Role.STUDENT) {
            return ResponseEntity.badRequest().build();
        }

        // Verificar se o aluno já está na sala
        if (classroom.getStudents().contains(student)) {
            return ResponseEntity.ok().build(); // Já está na sala, retorna sucesso
        }

        classroom.getStudents().add(student);
        classroomRepository.save(classroom);
        logger.info("Aluno {} adicionado à sala {}", studentId, id);
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
            // Verificar se o professor está na lista de professores da sala
            // Isso é mais confiável do que verificar o relacionamento inverso
            boolean hasAccess = classroom.getTeachers().contains(user);
            logger.info("Professor {} tentando remover aluno da sala {}. Tem acesso: {}", user.getEmail(), id, hasAccess);
            if (!hasAccess) {
                logger.warn("Professor {} não tem acesso à sala {}", user.getEmail(), id);
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

        // Verificar se o professor já está na sala
        if (classroom.getTeachers().contains(teacher)) {
            return ResponseEntity.ok().build(); // Já está na sala, retorna sucesso
        }

        classroom.getTeachers().add(teacher);
        classroomRepository.save(classroom);
        logger.info("Professor {} adicionado à sala {}", teacherId, id);
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

    @GetMapping("/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ClassroomDTO>> getUserClassrooms(@PathVariable Long userId, Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.badRequest().build();
        }

        // Verifica se o usuário pode acessar as salas do usuário solicitado
        boolean canAccess = false;
        if (currentUser.getRole() == Role.ADMIN) {
            canAccess = true;
        } else if (currentUser.getId().equals(userId)) {
            canAccess = true;
        } else if (currentUser.getRole() == Role.TEACHER) {
            // Professor pode ver salas onde ele é professor
            canAccess = true;
        }

        if (!canAccess) {
            return ResponseEntity.status(403).build();
        }

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null) {
            return ResponseEntity.notFound().build();
        }

        List<Classroom> classrooms = new ArrayList<>();
        
        if (currentUser.getRole() == Role.ADMIN) {
            // Admin vê todas as salas
            classrooms = classroomRepository.findAll();
        } else if (currentUser.getRole() == Role.TEACHER) {
            // Professor vê suas salas como professor
            classrooms = new ArrayList<>(currentUser.getClassroomsAsTeacher());
        } else {
            // Estudante vê suas salas
            classrooms = new ArrayList<>(targetUser.getClassrooms());
        }

        List<ClassroomDTO> dtos = classrooms.stream().map(classroom -> ClassroomDTO.builder()
            .id(classroom.getId())
            .name(classroom.getName())
            .academicYear(classroom.getAcademicYear())
            .teacherIds(classroom.getTeachers().stream().map(User::getId).toList())
            .teacherNames(classroom.getTeachers().stream().map(u -> u.getName() != null ? u.getName() : u.getEmail()).toList())
            .studentIds(classroom.getStudents().stream().map(User::getId).toList())
            .studentNames(classroom.getStudents().stream().map(u -> u.getName() != null ? u.getName() : u.getEmail()).toList())
            .studentCount(classroom.getStudents() != null ? classroom.getStudents().size() : 0)
            .active(classroom.getStudents() != null && !classroom.getStudents().isEmpty())
            .isActive(classroom.getIsActive() != null ? classroom.getIsActive() : true)
            .build()).toList();

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}/export/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<?> exportClassroomUsersToPdf(@PathVariable Long id, Authentication authentication) {
        try {
            Optional<Classroom> classroomOpt = classroomRepository.findById(id);
            if (classroomOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Classroom classroom = classroomOpt.get();
            User currentUser = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (currentUser == null) {
                return ResponseEntity.status(403).build();
            }

            // Verifica se o usuário tem acesso à sala
            boolean hasAccess = false;
            if (currentUser.getRole() == Role.ADMIN) {
                hasAccess = true;
            } else if (currentUser.getRole() == Role.TEACHER) {
                hasAccess = currentUser.getClassroomsAsTeacher().contains(classroom);
            }

            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }

            // Coleta todos os usuários da sala (professores e alunos)
            List<User> allUsers = new ArrayList<>();
            allUsers.addAll(classroom.getTeachers());
            allUsers.addAll(classroom.getStudents());

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            // Título
            Paragraph title = new Paragraph("Relatório de Usuários - " + classroom.getName())
                    .setFontSize(18)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(10);
            document.add(title);

            // Informações da sala
            Paragraph classroomInfo = new Paragraph("Ano Letivo: " + classroom.getAcademicYear())
                    .setFontSize(12)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(classroomInfo);

            // Data de geração
            Paragraph date = new Paragraph("Data de geração: " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")))
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(date);

            // Tabela
            float[] columnWidths = {1, 3, 2, 2};
            Table table = new Table(columnWidths);
            
            // Cabeçalho da tabela
            table.addHeaderCell(new Cell().add(new Paragraph("ID").setBold()).setBackgroundColor(ColorConstants.LIGHT_GRAY));
            table.addHeaderCell(new Cell().add(new Paragraph("E-MAIL").setBold()).setBackgroundColor(ColorConstants.LIGHT_GRAY));
            table.addHeaderCell(new Cell().add(new Paragraph("TIPO").setBold()).setBackgroundColor(ColorConstants.LIGHT_GRAY));
            table.addHeaderCell(new Cell().add(new Paragraph("STATUS").setBold()).setBackgroundColor(ColorConstants.LIGHT_GRAY));

            // Dados dos usuários
            for (User user : allUsers) {
                table.addCell(new Cell().add(new Paragraph(String.valueOf(user.getId()))));
                table.addCell(new Cell().add(new Paragraph(user.getEmail())));
                
                String roleLabel = switch (user.getRole()) {
                    case ADMIN -> "Admin";
                    case TEACHER -> "Professor";
                    case STUDENT -> "Estudante";
                    default -> user.getRole().toString();
                };
                table.addCell(new Cell().add(new Paragraph(roleLabel)));
                
                String statusLabel = user.isActive() ? "Ativo" : "Inativo";
                table.addCell(new Cell().add(new Paragraph(statusLabel)));
            }

            document.add(table);
            document.close();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            String filename = "usuarios_sala_" + classroom.getName().replaceAll("[^a-zA-Z0-9]", "_") + ".pdf";
            headers.setContentDispositionFormData("attachment", filename);
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

            return new ResponseEntity<>(baos.toByteArray(), headers, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Erro ao gerar PDF de usuários da sala: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Erro ao gerar PDF: " + e.getMessage());
        }
    }
}