package com.eaduck.backend.controller;

import com.eaduck.backend.model.attendance.Attendance;
import com.eaduck.backend.model.attendance.dto.AttendanceBulkDTO;
import com.eaduck.backend.model.attendance.dto.AttendanceDTO;
import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.enums.AttendanceStatus;
import com.eaduck.backend.model.enums.Period;
import com.eaduck.backend.model.enums.Role;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.AttendanceRepository;
import com.eaduck.backend.repository.ClassroomRepository;
import com.eaduck.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.io.ByteArrayOutputStream;
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
@RequestMapping("/api/attendances")
public class AttendanceController {

    private static final Logger logger = LoggerFactory.getLogger(AttendanceController.class);

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/classrooms")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<?> getClassroomsForAttendance(Authentication authentication) {
        try {
            User currentUser = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (currentUser == null) {
                logger.warn("Usuário não encontrado: {}", authentication.getName());
                return ResponseEntity.status(403).build();
            }

            List<Classroom> classrooms = new ArrayList<>();
            
            if (currentUser.getRole() == Role.ADMIN) {
                // Admin vê todas as salas ativas - usar query com fetch join
                try {
                    classrooms = classroomRepository.findAllActiveWithRelations();
                } catch (Exception e) {
                    logger.warn("Erro ao buscar salas com fetch join, tentando método padrão: {}", e.getMessage());
                    // Fallback para método padrão
                    List<Classroom> allClassrooms = classroomRepository.findAll();
                    for (Classroom c : allClassrooms) {
                        Boolean isActive = c.getIsActive();
                        if (isActive != null && isActive) {
                            try {
                                c.getStudents().size(); // Força carregamento lazy
                                c.getTeachers().size(); // Força carregamento lazy
                                classrooms.add(c);
                            } catch (Exception e2) {
                                logger.warn("Erro ao carregar relacionamentos da sala {}: {}", c.getId(), e2.getMessage());
                                classrooms.add(c);
                            }
                        }
                    }
                }
            } else if (currentUser.getRole() == Role.TEACHER) {
                // Teacher vê suas salas
                try {
                    Set<Classroom> teacherClassrooms = currentUser.getClassroomsAsTeacher();
                    if (teacherClassrooms == null) {
                        logger.warn("classroomsAsTeacher é null para o usuário {}", currentUser.getId());
                        teacherClassrooms = new HashSet<>();
                    }
                    
                    for (Classroom c : teacherClassrooms) {
                        if (c == null) continue;
                        
                        Boolean isActive = c.getIsActive();
                        if (isActive == null || isActive) {
                            // Forçar carregamento dos relacionamentos
                            try {
                                if (c.getStudents() != null) {
                                    c.getStudents().size(); // Força carregamento lazy
                                }
                                if (c.getTeachers() != null) {
                                    c.getTeachers().size(); // Força carregamento lazy
                                }
                                classrooms.add(c);
                            } catch (Exception e) {
                                logger.warn("Erro ao carregar relacionamentos da sala {}: {}", c.getId(), e.getMessage());
                                // Adiciona mesmo assim
                                classrooms.add(c);
                            }
                        }
                    }
                    
                    // Se não encontrou salas pelo relacionamento, tenta método alternativo com fetch join
                    if (classrooms.isEmpty()) {
                        logger.info("Nenhuma sala encontrada pelo relacionamento, tentando método alternativo com fetch join");
                        try {
                            List<Classroom> fetchedClassrooms = classroomRepository.findByTeacherWithRelations(currentUser);
                            if (fetchedClassrooms != null && !fetchedClassrooms.isEmpty()) {
                                classrooms = fetchedClassrooms;
                            } else {
                                // Último recurso: método padrão
                                Set<Classroom> altClassrooms = classroomRepository.findByTeachersContaining(currentUser);
                                if (altClassrooms != null) {
                                    classrooms = new ArrayList<>(altClassrooms);
                                }
                            }
                        } catch (Exception e3) {
                            logger.warn("Erro no método com fetch join: {}", e3.getMessage());
                            // Último recurso: método padrão
                            Set<Classroom> altClassrooms = classroomRepository.findByTeachersContaining(currentUser);
                            if (altClassrooms != null) {
                                classrooms = new ArrayList<>(altClassrooms);
                            }
                        }
                    }
                } catch (Exception e) {
                    logger.error("Erro ao buscar salas do professor: {}", e.getMessage(), e);
                    e.printStackTrace();
                    // Tenta método alternativo
                    try {
                        Set<Classroom> altClassrooms = classroomRepository.findByTeachersContaining(currentUser);
                        if (altClassrooms != null) {
                            classrooms = new ArrayList<>(altClassrooms);
                        }
                    } catch (Exception e2) {
                        logger.error("Erro no método alternativo: {}", e2.getMessage(), e2);
                    }
                }
            }

            List<ClassroomAttendanceInfo> result = new ArrayList<>();
            for (Classroom c : classrooms) {
                try {
                    ClassroomAttendanceInfo info = new ClassroomAttendanceInfo();
                    info.id = c.getId();
                    info.name = c.getName() != null ? c.getName() : "Sem nome";
                    info.academicYear = c.getAcademicYear() != null ? c.getAcademicYear() : "-";
                    
                    // Contar alunos de forma segura
                    try {
                        info.studentCount = c.getStudents() != null ? c.getStudents().size() : 0;
                    } catch (Exception e) {
                        logger.warn("Erro ao contar alunos da sala {}: {}", c.getId(), e.getMessage());
                        info.studentCount = 0;
                    }
                    
                    // Buscar nome do professor de forma segura
                    String teacherName = "-";
                    try {
                        if (c.getTeachers() != null && !c.getTeachers().isEmpty()) {
                            User firstTeacher = c.getTeachers().iterator().next();
                            if (firstTeacher != null) {
                                if (firstTeacher.getNomeCompleto() != null && !firstTeacher.getNomeCompleto().isEmpty()) {
                                    teacherName = firstTeacher.getNomeCompleto();
                                } else if (firstTeacher.getName() != null && !firstTeacher.getName().isEmpty()) {
                                    teacherName = firstTeacher.getName();
                                } else if (firstTeacher.getEmail() != null) {
                                    teacherName = firstTeacher.getEmail();
                                }
                            }
                        }
                    } catch (Exception e) {
                        logger.warn("Erro ao buscar professor da sala {}: {}", c.getId(), e.getMessage());
                    }
                    info.teacherName = teacherName;
                    
                    result.add(info);
                } catch (Exception e) {
                    logger.error("Erro ao processar sala {}: {}", c.getId(), e.getMessage(), e);
                    // Continua com próxima sala
                }
            }

            logger.info("Retornando {} salas para frequência", result.size());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Erro ao buscar salas para frequência: {}", e.getMessage(), e);
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erro ao buscar salas: " + e.getMessage());
        }
    }

    @GetMapping("/classroom/{classroomId}/date/{date}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<?> getAttendanceByClassroomAndDate(
            @PathVariable Long classroomId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
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

            // Verificar acesso
            boolean hasAccess = false;
            if (currentUser.getRole() == Role.ADMIN) {
                hasAccess = true;
            } else if (currentUser.getRole() == Role.TEACHER) {
                hasAccess = classroom.getTeachers().contains(currentUser);
            }

            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }

            // Buscar frequências existentes
            List<Attendance> attendances = attendanceRepository.findByClassroomAndDate(classroom, date);

            // Buscar todos os alunos da sala
            List<User> students = new ArrayList<>(classroom.getStudents());

            // Criar DTOs
            List<AttendanceDTO> result = new ArrayList<>();
            for (User student : students) {
                AttendanceDTO dto = new AttendanceDTO();
                dto.setClassroomId(classroom.getId());
                dto.setClassroomName(classroom.getName());
                dto.setStudentId(student.getId());
                dto.setStudentName(student.getNomeCompleto() != null ? student.getNomeCompleto() : 
                                 (student.getName() != null ? student.getName() : student.getEmail()));
                dto.setDate(date);

                // Buscar frequência existente para este aluno
                Optional<Attendance> existing = attendances.stream()
                        .filter(a -> a.getStudent().getId().equals(student.getId()))
                        .findFirst();

                if (existing.isPresent()) {
                    Attendance att = existing.get();
                    dto.setId(att.getId());
                    dto.setStatus(att.getStatus());
                    dto.setArrivalTime(att.getArrivalTime());
                    dto.setObservations(att.getObservations());
                    dto.setDiscipline(att.getDiscipline());
                    dto.setPeriod(att.getPeriod());
                    if (att.getTeacher() != null) {
                        dto.setTeacherId(att.getTeacher().getId());
                        dto.setTeacherName(att.getTeacher().getNomeCompleto() != null ? 
                                          att.getTeacher().getNomeCompleto() : 
                                          att.getTeacher().getName());
                    }
                } else {
                    dto.setStatus(AttendanceStatus.PRESENT); // Default
                }

                result.add(dto);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Erro ao buscar frequência: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Erro ao buscar frequência: " + e.getMessage());
        }
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<?> saveBulkAttendance(
            @RequestBody AttendanceBulkDTO bulkDTO,
            Authentication authentication) {
        try {
            User currentUser = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (currentUser == null) {
                return ResponseEntity.status(403).build();
            }

            Classroom classroom = classroomRepository.findById(bulkDTO.getClassroomId()).orElse(null);
            if (classroom == null) {
                return ResponseEntity.badRequest().body("Sala não encontrada");
            }

            // Verificar acesso
            boolean hasAccess = false;
            if (currentUser.getRole() == Role.ADMIN) {
                hasAccess = true;
            } else if (currentUser.getRole() == Role.TEACHER) {
                hasAccess = classroom.getTeachers().contains(currentUser);
            }

            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }

            // Salvar frequências
            for (AttendanceBulkDTO.StudentAttendanceDTO studentDTO : bulkDTO.getStudents()) {
                User student = userRepository.findById(studentDTO.getStudentId()).orElse(null);
                if (student == null) {
                    logger.warn("Aluno não encontrado: {}", studentDTO.getStudentId());
                    continue;
                }

                // Validar status
                if (studentDTO.getStatus() == null || studentDTO.getStatus().isEmpty()) {
                    logger.warn("Status não informado para aluno: {}", studentDTO.getStudentId());
                    continue;
                }

                Optional<Attendance> existing = attendanceRepository.findByClassroomAndStudentAndDate(
                        classroom, student, bulkDTO.getDate());

                Attendance attendance;
                if (existing.isPresent()) {
                    attendance = existing.get();
                } else {
                    attendance = Attendance.builder()
                            .classroom(classroom)
                            .student(student)
                            .date(bulkDTO.getDate())
                            .teacher(currentUser)
                            .build();
                }

                // Atualizar dados
                try {
                    AttendanceStatus status = AttendanceStatus.valueOf(studentDTO.getStatus().toUpperCase());
                    attendance.setStatus(status);
                    logger.debug("Status definido para aluno {}: {}", student.getId(), status);
                } catch (IllegalArgumentException e) {
                    logger.error("Status inválido para aluno {}: {}", student.getId(), studentDTO.getStatus());
                    continue;
                }
                
                attendance.setDiscipline(bulkDTO.getDiscipline());
                if (bulkDTO.getPeriod() != null && !bulkDTO.getPeriod().isEmpty()) {
                    try {
                        attendance.setPeriod(Period.valueOf(bulkDTO.getPeriod().toUpperCase()));
                    } catch (IllegalArgumentException e) {
                        logger.warn("Período inválido: {}", bulkDTO.getPeriod());
                    }
                }
                
                if (studentDTO.getArrivalTime() != null && !studentDTO.getArrivalTime().isEmpty()) {
                    try {
                        attendance.setArrivalTime(LocalTime.parse(studentDTO.getArrivalTime()));
                    } catch (Exception e) {
                        logger.warn("Erro ao parsear horário: {}", studentDTO.getArrivalTime());
                    }
                } else if (attendance.getStatus() != AttendanceStatus.LATE) {
                    attendance.setArrivalTime(null);
                }
                
                attendance.setObservations(studentDTO.getObservations());

                Attendance saved = attendanceRepository.save(attendance);
                logger.debug("Frequência salva para aluno {}: status={}", student.getId(), saved.getStatus());
            }
            
            logger.info("Frequências salvas com sucesso para {} alunos", bulkDTO.getStudents().size());

            return ResponseEntity.ok(java.util.Map.of("message", "Frequência salva com sucesso"));
        } catch (Exception e) {
            logger.error("Erro ao salvar frequência: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(java.util.Map.of("error", "Erro ao salvar frequência: " + e.getMessage()));
        }
    }

    @GetMapping("/classroom/{classroomId}/date/{date}/export/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<?> exportAttendanceToPdf(
            @PathVariable Long classroomId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
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

            // Verificar acesso
            boolean hasAccess = false;
            if (currentUser.getRole() == Role.ADMIN) {
                hasAccess = true;
            } else if (currentUser.getRole() == Role.TEACHER) {
                hasAccess = classroom.getTeachers().contains(currentUser);
            }

            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }

            // Buscar frequências
            List<Attendance> attendances = attendanceRepository.findByClassroomAndDate(classroom, date);
            List<User> students = new ArrayList<>(classroom.getStudents());
            
            logger.info("Gerando PDF - Sala: {}, Data: {}, Total alunos: {}, Frequências encontradas: {}", 
                    classroom.getName(), date, students.size(), attendances.size());
            
            // Log das frequências encontradas
            for (Attendance att : attendances) {
                logger.debug("Frequência encontrada - Aluno ID: {}, Status: {}", 
                        att.getStudent().getId(), att.getStatus());
            }

            // Gerar PDF usando iText7 (similar ao que já existe no projeto)
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf, PageSize.A4.rotate());

            // Cabeçalho
            Paragraph title = new Paragraph("Ficha de Frequência")
                    .setFontSize(16)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(10);
            document.add(title);

            // Informações
            Paragraph info = new Paragraph()
                    .setFontSize(11)
                    .setBold()
                    .setMarginBottom(10);
            info.add(new Paragraph("Nome da Sala: " + classroom.getName()));
            info.add(new Paragraph("Data: " + date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
            if (!attendances.isEmpty() && attendances.get(0).getDiscipline() != null) {
                info.add(new Paragraph("Disciplina: " + attendances.get(0).getDiscipline()));
            }
            if (!attendances.isEmpty() && attendances.get(0).getPeriod() != null) {
                info.add(new Paragraph("Período: " + attendances.get(0).getPeriod()));
            }
            document.add(info);

            // Tabela
            Table table = new Table(UnitValue.createPercentArray(new float[]{5, 40, 10, 10, 10, 15, 10}))
                    .useAllAvailableWidth();

            // Cabeçalho da tabela
            table.addHeaderCell(new Cell().add(
                    new Paragraph("Nº").setBold().setFontSize(8))
                    .setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(4));
            table.addHeaderCell(new Cell().add(
                    new Paragraph("Nome do Aluno").setBold().setFontSize(8))
                    .setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(4));
            table.addHeaderCell(new Cell().add(
                    new Paragraph("Presente").setBold().setFontSize(8))
                    .setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(4));
            table.addHeaderCell(new Cell().add(
                    new Paragraph("Ausente").setBold().setFontSize(8))
                    .setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(4));
            table.addHeaderCell(new Cell().add(
                    new Paragraph("Atrasado").setBold().setFontSize(8))
                    .setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(4));
            table.addHeaderCell(new Cell().add(
                    new Paragraph("Horário Chegada").setBold().setFontSize(8))
                    .setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(4));
            table.addHeaderCell(new Cell().add(
                    new Paragraph("Observações").setBold().setFontSize(8))
                    .setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(4));

            // Dados
            int numero = 1;
            for (User student : students) {
                // Buscar frequência do aluno - usar comparação segura de IDs
                Attendance attendance = null;
                for (Attendance att : attendances) {
                    if (att.getStudent() != null && att.getStudent().getId() != null && 
                        student.getId() != null && att.getStudent().getId().equals(student.getId())) {
                        attendance = att;
                        break;
                    }
                }

                table.addCell(new Cell().add(
                        new Paragraph(String.valueOf(numero++)).setFontSize(7)).setPadding(3));
                
                String studentName = student.getNomeCompleto() != null ? student.getNomeCompleto() : 
                                   (student.getName() != null ? student.getName() : student.getEmail());
                table.addCell(new Cell().add(
                        new Paragraph(studentName.length() > 30 ? 
                                studentName.substring(0, 27) + "..." : studentName).setFontSize(7)).setPadding(3));
                
                // Verificar status e exibir X correspondente
                String presente = "";
                String ausente = "";
                String atrasado = "";
                
                if (attendance != null && attendance.getStatus() != null) {
                    if (attendance.getStatus() == AttendanceStatus.PRESENT) {
                        presente = "X";
                    } else if (attendance.getStatus() == AttendanceStatus.ABSENT) {
                        ausente = "X";
                    } else if (attendance.getStatus() == AttendanceStatus.LATE) {
                        atrasado = "X";
                    }
                    logger.debug("Aluno {} - Status: {}", student.getId(), attendance.getStatus());
                } else {
                    logger.warn("Aluno {} sem frequência registrada", student.getId());
                }
                
                table.addCell(new Cell().add(
                        new Paragraph(presente).setFontSize(7)).setPadding(3));
                
                table.addCell(new Cell().add(
                        new Paragraph(ausente).setFontSize(7)).setPadding(3));
                
                table.addCell(new Cell().add(
                        new Paragraph(atrasado).setFontSize(7)).setPadding(3));
                
                String horario = "";
                if (attendance != null && attendance.getArrivalTime() != null) {
                    horario = attendance.getArrivalTime().format(DateTimeFormatter.ofPattern("HH:mm"));
                }
                table.addCell(new Cell().add(
                        new Paragraph(horario).setFontSize(7)).setPadding(3));
                
                String obs = "";
                if (attendance != null && attendance.getObservations() != null) {
                    obs = attendance.getObservations().length() > 20 ? 
                             attendance.getObservations().substring(0, 17) + "..." : 
                             attendance.getObservations();
                }
                table.addCell(new Cell().add(
                        new Paragraph(obs).setFontSize(7)).setPadding(3));
            }

            document.add(table);

            // Resumo - contar apenas frequências salvas
            long presentes = 0;
            long ausentes = 0;
            long atrasados = 0;
            
            for (Attendance att : attendances) {
                if (att.getStatus() != null) {
                    if (att.getStatus() == AttendanceStatus.PRESENT) {
                        presentes++;
                    } else if (att.getStatus() == AttendanceStatus.ABSENT) {
                        ausentes++;
                    } else if (att.getStatus() == AttendanceStatus.LATE) {
                        atrasados++;
                    }
                }
            }
            
            double percentual = students.size() > 0 ? (presentes * 100.0 / students.size()) : 0;
            
            logger.info("Resumo PDF - Total alunos: {}, Presentes: {}, Ausentes: {}, Atrasados: {}", 
                    students.size(), presentes, ausentes, atrasados);

            Paragraph resumo = new Paragraph()
                    .setFontSize(10)
                    .setBold()
                    .setMarginTop(15);
            resumo.add(new Paragraph("Total de alunos: " + students.size()));
            resumo.add(new Paragraph("Presentes: " + presentes));
            resumo.add(new Paragraph("Ausentes: " + ausentes));
            resumo.add(new Paragraph("Atrasados: " + atrasados));
            resumo.add(new Paragraph("Percentual de presença: " + 
                    String.format("%.2f", percentual) + "%"));
            document.add(resumo);

            document.close();

            byte[] pdfBytes = baos.toByteArray();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            String filename = "frequencia_" + classroom.getName().replaceAll("[^a-zA-Z0-9]", "_") + "_" + 
                            date.format(DateTimeFormatter.ofPattern("ddMMyyyy")) + ".pdf";
            headers.setContentDispositionFormData("attachment", filename);
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Erro ao gerar PDF de frequência: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Erro ao gerar PDF: " + e.getMessage());
        }
    }

    // Classe auxiliar para resposta
    private static class ClassroomAttendanceInfo {
        public Long id;
        public String name;
        public String academicYear;
        public Integer studentCount;
        public String teacherName;
    }
}

