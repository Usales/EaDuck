package com.eaduck.backend.controller;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.ClassroomRepository;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.repository.SubmissionRepository;
import com.eaduck.backend.model.submission.Submission;
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
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
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

    @Autowired
    private SubmissionRepository submissionRepository;


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

    @GetMapping("/{classroomId}/students/{studentId}/grades/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<?> exportStudentGradesToPdf(
            @PathVariable Long classroomId,
            @PathVariable Long studentId,
            Authentication authentication) {
        try {
            User currentUser = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (currentUser == null) {
                return ResponseEntity.status(403).build();
            }

            Classroom classroom = classroomRepository.findById(classroomId).orElse(null);
            if (classroom == null) {
                return ResponseEntity.notFound().build();
            }

            // Verifica se o usuário tem acesso à sala
            boolean hasAccess = false;
            if (currentUser.getRole() == Role.ADMIN) {
                hasAccess = true;
            } else if (currentUser.getRole() == Role.TEACHER) {
                hasAccess = classroom.getTeachers().contains(currentUser);
            }

            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }

            User student = userRepository.findById(studentId).orElse(null);
            if (student == null || student.getRole() != Role.STUDENT) {
                return ResponseEntity.badRequest().build();
            }

            // Verifica se o aluno está na sala
            if (!classroom.getStudents().contains(student)) {
                return ResponseEntity.badRequest().build();
            }

            // Buscar todas as tasks da sala
            List<com.eaduck.backend.model.task.Task> tasks = new ArrayList<>(classroom.getTasks());
            
            // Agrupar tasks por título (disciplina) - assumindo que tasks com mesmo título são da mesma disciplina
            java.util.Map<String, java.util.List<Submission>> submissionsByDisciplina = new java.util.HashMap<>();
            java.util.Map<String, String> disciplinaNames = new java.util.HashMap<>();
            
            for (com.eaduck.backend.model.task.Task task : tasks) {
                String disciplinaName = task.getTitle();
                Submission submission = submissionRepository.findByTaskIdAndStudentId(task.getId(), studentId);
                if (submission != null && submission.getGrade() != null) {
                    submissionsByDisciplina.computeIfAbsent(disciplinaName, k -> new java.util.ArrayList<>()).add(submission);
                    disciplinaNames.put(disciplinaName, disciplinaName);
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf, PageSize.A4);

            // Cabeçalho com nome da instituição
            Paragraph institution = new Paragraph("EaDuck - Sistema de Ensino")
                    .setFontSize(16)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(10);
            document.add(institution);

            // Título
            String studentName = student.getNomeCompleto() != null ? student.getNomeCompleto() : 
                                (student.getName() != null ? student.getName() : student.getEmail());
            Paragraph title = new Paragraph("Boletim de Notas – " + studentName)
                    .setFontSize(14)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(title);

            // Informações do aluno
            Paragraph studentInfo = new Paragraph()
                    .setFontSize(10)
                    .setMarginBottom(15);
            studentInfo.add(new Paragraph("Nome Completo: " + (student.getNomeCompleto() != null ? student.getNomeCompleto() : "-")));
            studentInfo.add(new Paragraph("Matrícula: " + student.getId()));
            studentInfo.add(new Paragraph("CPF: " + (student.getCpf() != null ? student.getCpf() : "-")));
            studentInfo.add(new Paragraph("Curso: " + (classroom.getName() != null ? classroom.getName() : "-")));
            studentInfo.add(new Paragraph("Ano Letivo: " + (classroom.getAcademicYear() != null ? classroom.getAcademicYear() : "-")));
            document.add(studentInfo);

            // Tabela de notas por disciplina
            if (!submissionsByDisciplina.isEmpty()) {
                UnitValue[] columnWidths = {
                    UnitValue.createPointValue(120),  // Disciplina
                    UnitValue.createPointValue(50),    // Nota 1
                    UnitValue.createPointValue(50),    // Nota 2
                    UnitValue.createPointValue(50),    // Nota 3
                    UnitValue.createPointValue(60)     // Média Final
                };
                Table gradesTable = new Table(columnWidths);
                gradesTable.setWidth(UnitValue.createPercentValue(100));

                // Cabeçalho
                gradesTable.addHeaderCell(new Cell().add(new Paragraph("Disciplina").setBold().setFontSize(9)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(5));
                gradesTable.addHeaderCell(new Cell().add(new Paragraph("Nota 1").setBold().setFontSize(9)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(5));
                gradesTable.addHeaderCell(new Cell().add(new Paragraph("Nota 2").setBold().setFontSize(9)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(5));
                gradesTable.addHeaderCell(new Cell().add(new Paragraph("Nota 3").setBold().setFontSize(9)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(5));
                gradesTable.addHeaderCell(new Cell().add(new Paragraph("Média Final").setBold().setFontSize(9)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(5));

                // Dados das disciplinas
                double totalMedia = 0.0;
                int countDisciplinas = 0;

                for (java.util.Map.Entry<String, java.util.List<Submission>> entry : submissionsByDisciplina.entrySet()) {
                    String disciplinaName = entry.getKey();
                    java.util.List<Submission> submissions = entry.getValue();
                    
                    // Ordenar submissions por data de avaliação (mais recente primeiro) ou por ID
                    submissions.sort((s1, s2) -> {
                        if (s1.getEvaluatedAt() != null && s2.getEvaluatedAt() != null) {
                            return s2.getEvaluatedAt().compareTo(s1.getEvaluatedAt());
                        }
                        return Long.compare(s2.getId(), s1.getId());
                    });
                    
                    // Pegar as 3 primeiras notas
                    Double nota1 = null, nota2 = null, nota3 = null;
                    for (int i = 0; i < Math.min(3, submissions.size()); i++) {
                        if (i == 0) nota1 = submissions.get(i).getGrade();
                        else if (i == 1) nota2 = submissions.get(i).getGrade();
                        else if (i == 2) nota3 = submissions.get(i).getGrade();
                    }

                    // Calcular média da disciplina
                    double sum = 0.0;
                    int count = 0;
                    for (Submission sub : submissions) {
                        if (sub.getGrade() != null) {
                            sum += sub.getGrade();
                            count++;
                        }
                    }
                    Double mediaDisciplina = count > 0 ? sum / count : null;

                    if (mediaDisciplina != null) {
                        totalMedia += mediaDisciplina;
                        countDisciplinas++;
                    }

                    // Adicionar linha na tabela
                    String disciplinaDisplay = disciplinaName != null ? (disciplinaName.length() > 30 ? disciplinaName.substring(0, 27) + "..." : disciplinaName) : "-";
                    gradesTable.addCell(new Cell().add(new Paragraph(disciplinaDisplay)).setFontSize(8).setPadding(5));
                    gradesTable.addCell(new Cell().add(new Paragraph(nota1 != null ? String.format("%.2f", nota1) : "-")).setFontSize(8).setPadding(5));
                    gradesTable.addCell(new Cell().add(new Paragraph(nota2 != null ? String.format("%.2f", nota2) : "-")).setFontSize(8).setPadding(5));
                    gradesTable.addCell(new Cell().add(new Paragraph(nota3 != null ? String.format("%.2f", nota3) : "-")).setFontSize(8).setPadding(5));
                    gradesTable.addCell(new Cell().add(new Paragraph(mediaDisciplina != null ? String.format("%.2f", mediaDisciplina) : "-")).setFontSize(8).setPadding(5));
                }

                document.add(gradesTable);
                document.add(new Paragraph(" ").setMarginBottom(10));

                // Resultado Final
                Double mediaFinal = countDisciplinas > 0 ? totalMedia / countDisciplinas : null;
                String resultadoFinal = getStudentFinalResult(mediaFinal);

                Paragraph resultado = new Paragraph()
                        .setFontSize(12)
                        .setBold()
                        .setMarginTop(15);
                resultado.add(new Paragraph("Média Final: " + (mediaFinal != null ? String.format("%.2f", mediaFinal) : "-")));
                resultado.add(new Paragraph("Resultado Final: " + resultadoFinal));
                document.add(resultado);
            } else {
                // Sem notas
                Paragraph semNotas = new Paragraph("Nenhuma nota registrada para este aluno.")
                        .setFontSize(10)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setMarginTop(20);
                document.add(semNotas);
                
                Paragraph resultado = new Paragraph()
                        .setFontSize(12)
                        .setBold()
                        .setMarginTop(15);
                resultado.add(new Paragraph("Resultado Final: Em andamento"));
                document.add(resultado);
            }

            // Rodapé com data de geração
            Paragraph footer = new Paragraph("Data de geração: " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")))
                    .setFontSize(8)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginTop(30);
            document.add(footer);

            document.close();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            String filename = "notas_" + studentName.replaceAll("[^a-zA-Z0-9]", "_") + ".pdf";
            headers.setContentDispositionFormData("attachment", filename);
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

            return new ResponseEntity<>(baos.toByteArray(), headers, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Erro ao gerar PDF de notas do aluno: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Erro ao gerar PDF: " + e.getMessage());
        }
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

    /**
     * Calcula a média final de um aluno na sala
     */
    private Double calculateStudentFinalAverage(User student, Classroom classroom) {
        // Buscar todas as tasks da sala
        List<com.eaduck.backend.model.task.Task> tasks = new ArrayList<>(classroom.getTasks());
        
        if (tasks.isEmpty()) {
            return null; // Sem notas = Em andamento
        }
        
        // Buscar todas as submissions do aluno nas tasks desta sala
        List<Submission> submissions = new ArrayList<>();
        for (com.eaduck.backend.model.task.Task task : tasks) {
            Submission submission = submissionRepository.findByTaskIdAndStudentId(task.getId(), student.getId());
            if (submission != null && submission.getGrade() != null) {
                submissions.add(submission);
            }
        }
        
        if (submissions.isEmpty()) {
            return null; // Sem notas = Em andamento
        }
        
        // Calcular média das notas
        double sum = 0.0;
        int count = 0;
        for (Submission submission : submissions) {
            if (submission.getGrade() != null) {
                sum += submission.getGrade();
                count++;
            }
        }
        
        return count > 0 ? sum / count : null;
    }
    
    /**
     * Determina o resultado final do aluno
     */
    private String getStudentFinalResult(Double mediaFinal) {
        if (mediaFinal == null) {
            return "Em andamento";
        } else if (mediaFinal >= 6.0) {
            return "Aprovado";
        } else {
            return "Reprovado";
        }
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
                hasAccess = classroom.getTeachers().contains(currentUser);
            }

            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf, PageSize.A4.rotate());

            // ========== 1. INFORMAÇÕES GERAIS DA SALA ==========
            Paragraph title = new Paragraph("Relatório de Dados da Sala - EaDuck")
                    .setFontSize(18)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(title);

            Paragraph classroomName = new Paragraph("Nome da Turma (Curso): " + (classroom.getName() != null ? classroom.getName() : "-"))
                    .setFontSize(12)
                    .setMarginBottom(5);
            document.add(classroomName);

            Paragraph academicYear = new Paragraph("Ano Letivo: " + (classroom.getAcademicYear() != null ? classroom.getAcademicYear() : "-"))
                    .setFontSize(12)
                    .setMarginBottom(20);
            document.add(academicYear);

            // Data de geração
            Paragraph date = new Paragraph("Data de geração: " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")))
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(date);

            // ========== 2. DADOS DOS ALUNOS ==========
            List<User> students = new ArrayList<>(classroom.getStudents());
            if (!students.isEmpty()) {
                Paragraph studentsTitle = new Paragraph("DADOS DOS ALUNOS")
                        .setFontSize(14)
                        .setBold()
                        .setMarginBottom(10);
                document.add(studentsTitle);

                UnitValue[] studentColumnWidths = {
                    UnitValue.createPointValue(15),   // ID
                    UnitValue.createPointValue(50),    // E-MAIL
                    UnitValue.createPointValue(80),   // NOME COMPLETO
                    UnitValue.createPointValue(50),    // CPF
                    UnitValue.createPointValue(40),    // DATA NASC.
                    UnitValue.createPointValue(70),    // NOME MÃE
                    UnitValue.createPointValue(70),    // NOME PAI
                    UnitValue.createPointValue(55),    // TELEFONE
                    UnitValue.createPointValue(90),    // ENDEREÇO
                    UnitValue.createPointValue(30),    // STATUS
                    UnitValue.createPointValue(40),    // MATRÍCULA
                    UnitValue.createPointValue(60),    // CURSO
                    UnitValue.createPointValue(40),    // ANO LETIVO
                    UnitValue.createPointValue(50)     // RESULTADO FINAL
                };
                Table studentTable = new Table(studentColumnWidths);
                studentTable.setWidth(UnitValue.createPercentValue(100));

                // Cabeçalho
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
                studentTable.addHeaderCell(new Cell().add(new Paragraph("MATRÍCULA").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                studentTable.addHeaderCell(new Cell().add(new Paragraph("CURSO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                studentTable.addHeaderCell(new Cell().add(new Paragraph("ANO LETIVO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                studentTable.addHeaderCell(new Cell().add(new Paragraph("RESULTADO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));

                // Dados dos alunos
                for (User student : students) {
                    studentTable.addCell(new Cell().add(new Paragraph(String.valueOf(student.getId()))).setFontSize(6).setPadding(3));
                    
                    String email = student.getEmail() != null ? (student.getEmail().length() > 20 ? student.getEmail().substring(0, 17) + "..." : student.getEmail()) : "-";
                    studentTable.addCell(new Cell().add(new Paragraph(email)).setFontSize(6).setPadding(3));
                    
                    String nomeCompleto = student.getNomeCompleto() != null ? (student.getNomeCompleto().length() > 25 ? student.getNomeCompleto().substring(0, 22) + "..." : student.getNomeCompleto()) : "-";
                    studentTable.addCell(new Cell().add(new Paragraph(nomeCompleto)).setFontSize(6).setPadding(3));
                    
                    studentTable.addCell(new Cell().add(new Paragraph(student.getCpf() != null ? student.getCpf() : "-")).setFontSize(6).setPadding(3));
                    studentTable.addCell(new Cell().add(new Paragraph(student.getDataNascimento() != null ? student.getDataNascimento() : "-")).setFontSize(6).setPadding(3));
                    
                    String nomeMae = student.getNomeMae() != null ? (student.getNomeMae().length() > 22 ? student.getNomeMae().substring(0, 19) + "..." : student.getNomeMae()) : "-";
                    studentTable.addCell(new Cell().add(new Paragraph(nomeMae)).setFontSize(6).setPadding(3));
                    
                    String nomePai = student.getNomePai() != null ? (student.getNomePai().length() > 22 ? student.getNomePai().substring(0, 19) + "..." : student.getNomePai()) : "-";
                    studentTable.addCell(new Cell().add(new Paragraph(nomePai)).setFontSize(6).setPadding(3));
                    
                    studentTable.addCell(new Cell().add(new Paragraph(student.getTelefone() != null ? student.getTelefone() : "-")).setFontSize(6).setPadding(3));
                    
                    String endereco = student.getEndereco() != null ? (student.getEndereco().length() > 28 ? student.getEndereco().substring(0, 25) + "..." : student.getEndereco()) : "-";
                    studentTable.addCell(new Cell().add(new Paragraph(endereco)).setFontSize(6).setPadding(3));
                    
                    String statusLabel = student.isActive() ? "Ativo" : "Inativo";
                    studentTable.addCell(new Cell().add(new Paragraph(statusLabel)).setFontSize(6).setPadding(3));
                    
                    // Matrícula (usando ID como matrícula)
                    studentTable.addCell(new Cell().add(new Paragraph(String.valueOf(student.getId()))).setFontSize(6).setPadding(3));
                    
                    // Curso (Nome da Turma)
                    String curso = classroom.getName() != null ? (classroom.getName().length() > 18 ? classroom.getName().substring(0, 15) + "..." : classroom.getName()) : "-";
                    studentTable.addCell(new Cell().add(new Paragraph(curso)).setFontSize(6).setPadding(3));
                    
                    // Ano Letivo
                    studentTable.addCell(new Cell().add(new Paragraph(classroom.getAcademicYear() != null ? classroom.getAcademicYear() : "-")).setFontSize(6).setPadding(3));
                    
                    // Resultado Final
                    Double mediaFinal = calculateStudentFinalAverage(student, classroom);
                    String resultadoFinal = getStudentFinalResult(mediaFinal);
                    studentTable.addCell(new Cell().add(new Paragraph(resultadoFinal)).setFontSize(6).setPadding(3));
                }

                document.add(studentTable);
                document.add(new Paragraph(" ").setMarginBottom(15));
            }

            // ========== 3. DADOS DOS PROFESSORES ==========
            List<User> teachers = new ArrayList<>(classroom.getTeachers().stream()
                    .filter(t -> t.getRole() == Role.TEACHER)
                    .toList());
            if (!teachers.isEmpty()) {
                Paragraph teachersTitle = new Paragraph("DADOS DOS PROFESSORES")
                        .setFontSize(14)
                        .setBold()
                        .setMarginBottom(10);
                document.add(teachersTitle);

                UnitValue[] teacherColumnWidths = {
                    UnitValue.createPointValue(15),   // ID
                    UnitValue.createPointValue(50),    // E-MAIL
                    UnitValue.createPointValue(80),    // NOME COMPLETO
                    UnitValue.createPointValue(50),    // CPF
                    UnitValue.createPointValue(90),    // ENDEREÇO
                    UnitValue.createPointValue(70),    // TITULAÇÃO
                    UnitValue.createPointValue(50),    // TIPO
                    UnitValue.createPointValue(30)     // STATUS
                };
                Table teacherTable = new Table(teacherColumnWidths);
                teacherTable.setWidth(UnitValue.createPercentValue(100));

                // Cabeçalho
                teacherTable.addHeaderCell(new Cell().add(new Paragraph("ID").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                teacherTable.addHeaderCell(new Cell().add(new Paragraph("E-MAIL").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                teacherTable.addHeaderCell(new Cell().add(new Paragraph("NOME COMPLETO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                teacherTable.addHeaderCell(new Cell().add(new Paragraph("CPF").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                teacherTable.addHeaderCell(new Cell().add(new Paragraph("ENDEREÇO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                teacherTable.addHeaderCell(new Cell().add(new Paragraph("TITULAÇÃO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                teacherTable.addHeaderCell(new Cell().add(new Paragraph("TIPO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                teacherTable.addHeaderCell(new Cell().add(new Paragraph("STATUS").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));

                // Dados dos professores
                for (User teacher : teachers) {
                    teacherTable.addCell(new Cell().add(new Paragraph(String.valueOf(teacher.getId()))).setFontSize(6).setPadding(3));
                    
                    String email = teacher.getEmail() != null ? (teacher.getEmail().length() > 20 ? teacher.getEmail().substring(0, 17) + "..." : teacher.getEmail()) : "-";
                    teacherTable.addCell(new Cell().add(new Paragraph(email)).setFontSize(6).setPadding(3));
                    
                    String nomeCompleto = teacher.getNomeCompleto() != null ? (teacher.getNomeCompleto().length() > 25 ? teacher.getNomeCompleto().substring(0, 22) + "..." : teacher.getNomeCompleto()) : "-";
                    teacherTable.addCell(new Cell().add(new Paragraph(nomeCompleto)).setFontSize(6).setPadding(3));
                    
                    teacherTable.addCell(new Cell().add(new Paragraph(teacher.getCpf() != null ? teacher.getCpf() : "-")).setFontSize(6).setPadding(3));
                    
                    String endereco = teacher.getEndereco() != null ? (teacher.getEndereco().length() > 28 ? teacher.getEndereco().substring(0, 25) + "..." : teacher.getEndereco()) : "-";
                    teacherTable.addCell(new Cell().add(new Paragraph(endereco)).setFontSize(6).setPadding(3));
                    
                    String titulacao = teacher.getTitulacao() != null ? (teacher.getTitulacao().length() > 22 ? teacher.getTitulacao().substring(0, 19) + "..." : teacher.getTitulacao()) : "-";
                    teacherTable.addCell(new Cell().add(new Paragraph(titulacao)).setFontSize(6).setPadding(3));
                    
                    teacherTable.addCell(new Cell().add(new Paragraph("Professor")).setFontSize(6).setPadding(3));
                    
                    String statusLabel = teacher.isActive() ? "Ativo" : "Inativo";
                    teacherTable.addCell(new Cell().add(new Paragraph(statusLabel)).setFontSize(6).setPadding(3));
                }

                document.add(teacherTable);
                document.add(new Paragraph(" ").setMarginBottom(15));
            }

            // ========== 4. DADOS DOS ADMINISTRADORES ==========
            List<User> admins = new ArrayList<>(classroom.getTeachers().stream()
                    .filter(t -> t.getRole() == Role.ADMIN)
                    .toList());
            if (!admins.isEmpty()) {
                Paragraph adminsTitle = new Paragraph("DADOS DOS ADMINISTRADORES")
                        .setFontSize(14)
                        .setBold()
                        .setMarginBottom(10);
                document.add(adminsTitle);

                UnitValue[] adminColumnWidths = {
                    UnitValue.createPointValue(15),   // ID
                    UnitValue.createPointValue(50),    // E-MAIL
                    UnitValue.createPointValue(80),    // NOME COMPLETO
                    UnitValue.createPointValue(50),    // CPF
                    UnitValue.createPointValue(90),    // ENDEREÇO
                    UnitValue.createPointValue(70),    // TITULAÇÃO
                    UnitValue.createPointValue(50),    // TIPO
                    UnitValue.createPointValue(30)     // STATUS
                };
                Table adminTable = new Table(adminColumnWidths);
                adminTable.setWidth(UnitValue.createPercentValue(100));

                // Cabeçalho
                adminTable.addHeaderCell(new Cell().add(new Paragraph("ID").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                adminTable.addHeaderCell(new Cell().add(new Paragraph("E-MAIL").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                adminTable.addHeaderCell(new Cell().add(new Paragraph("NOME COMPLETO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                adminTable.addHeaderCell(new Cell().add(new Paragraph("CPF").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                adminTable.addHeaderCell(new Cell().add(new Paragraph("ENDEREÇO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                adminTable.addHeaderCell(new Cell().add(new Paragraph("TITULAÇÃO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                adminTable.addHeaderCell(new Cell().add(new Paragraph("TIPO").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
                adminTable.addHeaderCell(new Cell().add(new Paragraph("STATUS").setBold().setFontSize(7)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));

                // Dados dos administradores
                for (User admin : admins) {
                    adminTable.addCell(new Cell().add(new Paragraph(String.valueOf(admin.getId()))).setFontSize(6).setPadding(3));
                    
                    String email = admin.getEmail() != null ? (admin.getEmail().length() > 20 ? admin.getEmail().substring(0, 17) + "..." : admin.getEmail()) : "-";
                    adminTable.addCell(new Cell().add(new Paragraph(email)).setFontSize(6).setPadding(3));
                    
                    String nomeCompleto = admin.getNomeCompleto() != null ? (admin.getNomeCompleto().length() > 25 ? admin.getNomeCompleto().substring(0, 22) + "..." : admin.getNomeCompleto()) : "-";
                    adminTable.addCell(new Cell().add(new Paragraph(nomeCompleto)).setFontSize(6).setPadding(3));
                    
                    adminTable.addCell(new Cell().add(new Paragraph(admin.getCpf() != null ? admin.getCpf() : "-")).setFontSize(6).setPadding(3));
                    
                    String endereco = admin.getEndereco() != null ? (admin.getEndereco().length() > 28 ? admin.getEndereco().substring(0, 25) + "..." : admin.getEndereco()) : "-";
                    adminTable.addCell(new Cell().add(new Paragraph(endereco)).setFontSize(6).setPadding(3));
                    
                    String titulacao = admin.getTitulacao() != null ? (admin.getTitulacao().length() > 22 ? admin.getTitulacao().substring(0, 19) + "..." : admin.getTitulacao()) : "-";
                    adminTable.addCell(new Cell().add(new Paragraph(titulacao)).setFontSize(6).setPadding(3));
                    
                    adminTable.addCell(new Cell().add(new Paragraph("Administrador")).setFontSize(6).setPadding(3));
                    
                    String statusLabel = admin.isActive() ? "Ativo" : "Inativo";
                    adminTable.addCell(new Cell().add(new Paragraph(statusLabel)).setFontSize(6).setPadding(3));
                }

                document.add(adminTable);
            }

            document.close();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            String filename = "dados_sala_" + classroom.getName().replaceAll("[^a-zA-Z0-9]", "_") + ".pdf";
            headers.setContentDispositionFormData("attachment", filename);
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

            return new ResponseEntity<>(baos.toByteArray(), headers, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Erro ao gerar PDF de dados da sala: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Erro ao gerar PDF: " + e.getMessage());
        }
    }
}