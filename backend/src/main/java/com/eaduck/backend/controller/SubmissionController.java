package com.eaduck.backend.controller;

import com.eaduck.backend.model.submission.Submission;
import com.eaduck.backend.model.submission.dto.SubmissionCreateDTO;
import com.eaduck.backend.model.submission.dto.SubmissionEvaluateDTO;
import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.model.submission.dto.SubmissionDTO;
import com.eaduck.backend.model.user.dto.UserDTO;
import com.eaduck.backend.repository.SubmissionRepository;
import com.eaduck.backend.repository.TaskRepository;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import javax.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.security.Principal;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    private final SubmissionRepository submissionRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    @Autowired
    private JavaMailSender mailSender;

    private static final Logger logger = LoggerFactory.getLogger(SubmissionController.class);

    private static final List<String> ALLOWED_FILE_TYPES = List.of(
        "application/pdf", // PDF
        "application/msword", // DOC
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
        "application/vnd.ms-excel", // XLS
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
        "application/vnd.ms-powerpoint", // PPT
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
        "text/plain", // TXT
        "image/jpeg", // JPG
        "image/png", // PNG
        "application/zip", // ZIP
        "application/x-rar-compressed" // RAR
    );

    private static final long MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

    @Autowired
    public SubmissionController(
            SubmissionRepository submissionRepository,
            TaskRepository taskRepository,
            UserRepository userRepository,
            NotificationService notificationService) {
        this.submissionRepository = submissionRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @PostMapping
    public ResponseEntity<?> submitTask(
        @ModelAttribute SubmissionCreateDTO dto,
        @RequestParam(value = "file", required = false) MultipartFile file,
        Principal principal
    ) {
        User student = userRepository.findByEmail(principal.getName()).orElse(null);
        Task task = taskRepository.findById(dto.getTaskId()).orElse(null);
        if (student == null || task == null) return ResponseEntity.badRequest().build();
        Submission submission = Submission.builder()
            .task(task)
            .student(student)
            .content(dto.getContent())
            .submittedAt(LocalDateTime.now())
            .build();
        // TODO: salvar arquivo e setar fileUrl
        submissionRepository.save(submission);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/task/{taskId}/me")
    public ResponseEntity<SubmissionDTO> getMySubmission(@PathVariable Long taskId, Principal principal) {
        User student = userRepository.findByEmail(principal.getName()).orElse(null);
        if (student == null) return ResponseEntity.badRequest().build();
        Submission submission = submissionRepository.findByTaskIdAndStudentId(taskId, student.getId());
        if (submission == null) return ResponseEntity.notFound().build();
        SubmissionDTO dto = toDTO(submission);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/task/{taskId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<List<SubmissionDTO>> getAllSubmissions(@PathVariable Long taskId, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return ResponseEntity.notFound().build();
        if (user.getRole().name().equals("ROLE_TEACHER")) {
            // Verifica se o professor leciona na turma da tarefa
            if (task.getClassroom() == null || !user.getClassroomsAsTeacher().contains(task.getClassroom())) {
                return ResponseEntity.status(403).build();
            }
        }
        List<Submission> submissions = submissionRepository.findByTaskId(taskId);
        List<SubmissionDTO> dtos = submissions.stream().map(this::toDTO).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/{submissionId}/evaluate")
    public ResponseEntity<?> evaluateSubmission(
        @PathVariable Long submissionId,
        @RequestBody SubmissionEvaluateDTO dto
    ) {
        Submission submission = submissionRepository.findById(submissionId).orElse(null);
        if (submission == null) return ResponseEntity.notFound().build();
        submission.setGrade(dto.getGrade());
        submission.setFeedback(dto.getFeedback());
        submission.setEvaluatedAt(LocalDateTime.now());
        submissionRepository.save(submission);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/task/{taskId}/upload")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> submitTaskWithFile(
            @PathVariable Long taskId,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            Optional<Task> taskOpt = taskRepository.findById(taskId);
            User student = userRepository.findByEmail(email).orElse(null);
            if (taskOpt.isEmpty() || student == null) {
                logger.error("Tarefa ou aluno não encontrado. taskId={}, email={}", taskId, email);
                return ResponseEntity.badRequest().body("Tarefa ou aluno não encontrado.");
            }
            Task task = taskOpt.get();
            User teacher = task.getCreatedBy();

            // Validação do arquivo
            if (!file.isEmpty()) {
                // Verifica o tipo do arquivo
                if (!ALLOWED_FILE_TYPES.contains(file.getContentType())) {
                    logger.warn("Tipo de arquivo não permitido: {}", file.getContentType());
                    return ResponseEntity.badRequest().body("Tipo de arquivo não permitido. Tipos permitidos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG, ZIP, RAR");
                }

                // Verifica o tamanho do arquivo
                if (file.getSize() > MAX_FILE_SIZE) {
                    logger.warn("Arquivo muito grande: {} bytes", file.getSize());
                    return ResponseEntity.badRequest().body("O arquivo é muito grande. Tamanho máximo permitido: 8MB");
                }
            }

            String fileUrl = null;
            if (!file.isEmpty()) {
                try {
                    String uploadDir = "uploads/";
                    String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                    Path path = Paths.get(uploadDir + fileName);
                    Files.createDirectories(path.getParent());
                    Files.write(path, file.getBytes());
                    fileUrl = "/files/" + fileName;
                } catch (Exception e) {
                    logger.error("Erro ao salvar arquivo: {}", e.getMessage(), e);
                    return ResponseEntity.status(500).body("Erro ao salvar arquivo: " + e.getMessage());
                }
            }

            Submission submission = Submission.builder()
                    .task(task)
                    .student(student)
                    .content(content)
                    .submittedAt(LocalDateTime.now())
                    .build();

            try {
                java.lang.reflect.Field f = Submission.class.getDeclaredField("fileUrl");
                f.setAccessible(true);
                f.set(submission, fileUrl);
            } catch (Exception ignore) {}

            // Bloquear novo envio se já existir submissão para o aluno/tarefa
            Submission existing = submissionRepository.findByTaskIdAndStudentId(task.getId(), student.getId());
            if (existing != null) {
                return ResponseEntity.badRequest().body("Você já enviou essa atividade. Não é possível enviar novamente.");
            }

            submission = submissionRepository.save(submission);

            // Enviar notificação por e-mail para o professor
            if (teacher != null && teacher.getEmail() != null) {
                try {
                    MimeMessage mimeMessage = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                    helper.setTo(teacher.getEmail());
                    helper.setSubject("[EaDuck] Nova submissão aguardando avaliação: " + task.getTitle());
                    String html = "" +
                        "<div style='background:#f4f6fb;padding:32px 0;font-family:sans-serif;'>" +
                        "  <div style='max-width:480px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 2px 8px #0001;padding:32px;text-align:center;'>" +
                        "    <div style='display:flex;align-items:center;justify-content:center;margin-bottom:16px;'>" +
                        "      <div style='background:#6366f1;border-radius:50%;width:64px;height:64px;display:flex;align-items:center;justify-content:center;'>" +
                        "        <img src='@favicon.png' alt='Pato de borracha' style='width:40px;height:40px;'/>" +
                        "      </div>" +
                        "    </div>" +
                        "    <span style='display:inline-block;background:#6366f1;color:#fff;border-radius:8px;padding:4px 16px;font-size:14px;font-weight:bold;margin-bottom:8px;'>Submissão recebida!</span>" +
                        "    <h2 style='color:#232b3e;margin-bottom:8px;'>" + task.getTitle() + "</h2>" +
                        "    <div style='color:#888;font-size:15px;margin-bottom:8px;'>Aluno: <b>" + student.getEmail() + "</b></div>" +
                        (content != null && !content.isEmpty() ? "<div style='color:#444;font-size:16px;margin-bottom:16px;'><b>Comentário do aluno:</b> <i>" + content + "</i></div>" : "") +
                        "    <div style='color:#444;font-size:16px;margin-bottom:16px;'>A submissão já está disponível para sua avaliação no sistema.</div>" +
                        "    <a href='https://eaduck.com/tasks' style='display:inline-block;margin:16px 0 0 0;padding:12px 32px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;letter-spacing:1px;'>Acessar EaDuck</a>" +
                        "    <div style='margin-top:32px;color:#aaa;font-size:13px;'>Esta é uma notificação automática do sistema EaDuck.<br/>Não responda este e-mail.</div>" +
                        "  </div>" +
                        "</div>";
                    helper.setText(html, true);
                    helper.setFrom("compeaduck@gmail.com");
                    mailSender.send(mimeMessage);
                } catch (Exception e) {
                    logger.error("Erro ao enviar e-mail: {}", e.getMessage(), e);
                }
            }

            // Enviar confirmação para o aluno
            if (student.getEmail() != null) {
                try {
                    MimeMessage mimeMessage = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                    helper.setTo(student.getEmail());
                    helper.setSubject("[EaDuck] Sua tarefa foi enviada com sucesso!");
                    String html = "" +
                        "<div style='background:#f4f6fb;padding:32px 0;font-family:sans-serif;'>" +
                        "  <div style='max-width:480px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 2px 8px #0001;padding:32px;text-align:center;'>" +
                        "    <div style='display:flex;align-items:center;justify-content:center;margin-bottom:16px;'>" +
                        "      <div style='background:#6366f1;border-radius:50%;width:64px;height:64px;display:flex;align-items:center;justify-content:center;'>" +
                        "        <img src='@favicon.png' alt='Pato de borracha' style='width:40px;height:40px;'/>" +
                        "      </div>" +
                        "    </div>" +
                        "    <span style='display:inline-block;background:#6366f1;color:#fff;border-radius:8px;padding:4px 16px;font-size:14px;font-weight:bold;margin-bottom:8px;'>Tarefa enviada com sucesso!</span>" +
                        "    <h2 style='color:#232b3e;margin-bottom:8px;'>" + task.getTitle() + "</h2>" +
                        "    <div style='color:#444;font-size:16px;margin-bottom:16px;'>🦆 Olá, " + student.getName() + "!<br>Recebemos sua submissão para a tarefa acima.<br>Parabéns por mais um passo na sua jornada de aprendizado!</div>" +
                        (content != null && !content.isEmpty() ? "<div style='color:#444;font-size:16px;margin-bottom:16px;'><b>Comentário enviado:</b> <i>" + content + "</i></div>" : "") +
                        "    <div style='color:#888;font-size:15px;margin-bottom:8px;'>Professor responsável: <b>" + (teacher != null ? teacher.getName() : "") + "</b></div>" +
                        "    <div style='color:#444;font-size:16px;margin-bottom:16px;'>O professor irá avaliar sua atividade em breve. Fique de olho no sistema e no seu e-mail para acompanhar o resultado.<br>Continue se dedicando, você está indo muito bem!</div>" +
                        "    <a href='https://eaduck.com/tasks' style='display:inline-block;margin:16px 0 0 0;padding:12px 32px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;letter-spacing:1px;'>Acessar EaDuck</a>" +
                        "    <div style='margin-top:32px;color:#aaa;font-size:13px;'>Esta é uma confirmação automática do sistema EaDuck.<br/>Não responda este e-mail.</div>" +
                        "  </div>" +
                        "</div>";
                    helper.setText(html, true);
                    helper.setFrom("compeaduck@gmail.com");
                    mailSender.send(mimeMessage);
                } catch (Exception e) {
                    logger.error("Erro ao enviar e-mail de confirmação para aluno: {}", e.getMessage(), e);
                }
            }

            // Criar notificação no sistema
            String message = "Nova submissão da tarefa: " + task.getTitle() + " por " + student.getName();
            notificationService.createNotification(teacher.getId(), taskId, message, "SUBMISSION_RECEIVED");

            return ResponseEntity.ok("Submissão realizada com sucesso!");
        } catch (Exception ex) {
            logger.error("Erro inesperado ao submeter tarefa: {}", ex.getMessage(), ex);
            return ResponseEntity.status(500).body("Erro inesperado ao cadastrar a tarefa ou enviar e-mail: " + ex.getMessage());
        }
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN') or #studentId == authentication.name")
    public ResponseEntity<List<SubmissionDTO>> getSubmissionsByStudent(@PathVariable Long studentId) {
        List<Submission> submissions = submissionRepository.findByStudentId(studentId);
        List<SubmissionDTO> dtos = submissions.stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<Submission> updateSubmission(@PathVariable Long id, @RequestBody Submission updated) {
        return submissionRepository.findById(id)
            .map(submission -> {
                submission.setContent(updated.getContent());
                submissionRepository.save(submission);
                return ResponseEntity.ok(submission);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> deleteSubmission(@PathVariable Long id) {
        if (!submissionRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        submissionRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SubmissionDTO>> getMySubmissions(Principal principal) {
        User student = userRepository.findByEmail(principal.getName()).orElse(null);
        if (student == null) return ResponseEntity.badRequest().build();
        List<Submission> submissions = submissionRepository.findByStudentId(student.getId());
        List<SubmissionDTO> dtos = submissions.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<List<SubmissionDTO>> getAllSubmissions() {
        List<Submission> submissions = submissionRepository.findAll();
        List<SubmissionDTO> dtos = submissions.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    private SubmissionDTO toDTO(Submission submission) {
        SubmissionDTO dto = new SubmissionDTO();
        dto.setId(submission.getId());
        dto.setTaskId(submission.getTask().getId());
        dto.setStudentId(submission.getStudent().getId());
        dto.setContent(submission.getContent());
        dto.setFileUrl(submission.getFileUrl());
        dto.setSubmittedAt(submission.getSubmittedAt());
        dto.setGrade(submission.getGrade());
        dto.setFeedback(submission.getFeedback());
        dto.setEvaluatedAt(submission.getEvaluatedAt());
        dto.setStudentName(submission.getStudent().getName());
        dto.setStudentEmail(submission.getStudent().getEmail());
        return dto;
    }
} 