package com.eaduck.backend.controller;

import com.eaduck.backend.model.task.dto.TaskDTO;
import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.model.task.TaskAttachment;
import com.eaduck.backend.model.task.dto.TaskAttachmentDTO;
import com.eaduck.backend.repository.TaskRepository;
import com.eaduck.backend.repository.TaskAttachmentRepository;
import com.eaduck.backend.service.TaskService;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.model.enums.Role;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.eaduck.backend.service.NotificationService;
import com.eaduck.backend.repository.ClassroomRepository;
import com.eaduck.backend.model.classroom.Classroom;
import java.time.LocalDateTime;

import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.ArrayList;
import com.eaduck.backend.model.task.dto.TaskSimpleDTO;
import java.util.Map;
import com.eaduck.backend.repository.SubmissionRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.IOException;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private TaskAttachmentRepository taskAttachmentRepository;

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
        "image/gif", // GIF
        "image/webp", // WEBP
        "video/mp4", // MP4
        "video/avi", // AVI
        "video/mov", // MOV
        "application/zip", // ZIP
        "application/x-rar-compressed" // RAR
    );

    private static final long MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TaskSimpleDTO>> getAllTasks(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        if (user.getRole() == Role.ADMIN) {
            List<TaskSimpleDTO> dtos = taskRepository.findAll().stream()
                .map(task -> new TaskSimpleDTO(
                    task.getId(),
                    task.getTitle(),
                    task.getDescription(),
                    task.getDueDate(),
                    task.getType(),
                    task.getClassroom().getId(),
                    task.getClassroom().getName(),
                    task.getClassroom().getAcademicYear(),
                    task.getDiscipline()
                ))
                .collect(java.util.stream.Collectors.toList());
            return ResponseEntity.ok(dtos);
        } else if (user.getRole() == Role.TEACHER) {
            Set<TaskSimpleDTO> teacherTasks = new java.util.HashSet<>();
            user.getClassroomsAsTeacher().forEach(classroom ->
                classroom.getTasks().forEach(task -> teacherTasks.add(new TaskSimpleDTO(
                    task.getId(),
                    task.getTitle(),
                    task.getDescription(),
                    task.getDueDate(),
                    task.getType(),
                    classroom.getId(),
                    classroom.getName(),
                    classroom.getAcademicYear(),
                    task.getDiscipline()
                )))
            );
            return ResponseEntity.ok(new java.util.ArrayList<>(teacherTasks));
        } else {
            Set<TaskSimpleDTO> studentTasks = new java.util.HashSet<>();
            user.getClassrooms().forEach(classroom ->
                classroom.getTasks().forEach(task -> studentTasks.add(new TaskSimpleDTO(
                    task.getId(),
                    task.getTitle(),
                    task.getDescription(),
                    task.getDueDate(),
                    task.getType(),
                    classroom.getId(),
                    classroom.getName(),
                    classroom.getAcademicYear(),
                    task.getDiscipline()
                )))
            );
            return ResponseEntity.ok(new java.util.ArrayList<>(studentTasks));
        }
    }

    @GetMapping("/sent")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TaskSimpleDTO>> getSentTasks(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        List<Task> sentTasks = taskRepository.findByCreatedBy(user);
        List<TaskSimpleDTO> dtos = sentTasks.stream()
            .map(task -> new TaskSimpleDTO(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getDueDate(),
                task.getType(),
                task.getClassroom().getId(),
                task.getClassroom().getName(),
                task.getClassroom().getAcademicYear(),
                task.getDiscipline()
            ))
            .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Task> getTaskById(@PathVariable Long id, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        Task task = taskRepository.findById(id).orElse(null);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }

        // Verifica se o usuário tem acesso à tarefa
        boolean hasAccess = false;
        if (user.getRole() == Role.ADMIN) {
            hasAccess = true;
        } else if (user.getRole() == Role.TEACHER) {
            hasAccess = user.getClassroomsAsTeacher().stream()
                .anyMatch(classroom -> classroom.getTasks().contains(task));
        } else {
            hasAccess = user.getClassrooms().stream()
                .anyMatch(classroom -> classroom.getTasks().contains(task));
        }

        if (!hasAccess) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(task);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<TaskSimpleDTO> createTask(@RequestBody TaskDTO dto, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        Classroom classroom = classroomRepository.findById(dto.getClassroomId()).orElse(null);
        if (classroom == null) {
            return ResponseEntity.badRequest().build();
        }

        // Verifica se o professor tem acesso à sala
        if (user.getRole() == Role.TEACHER) {
            boolean hasAccess = user.getClassroomsAsTeacher().stream()
                .anyMatch(c -> c.getId().equals(classroom.getId()));
            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }
        }

        Task task = Task.builder()
            .title(dto.getTitle())
            .description(dto.getDescription())
            .dueDate(dto.getDueDate())
            .type(dto.getType())
            .discipline(dto.getDiscipline())
            .classroom(classroom)
            .createdBy(user)
            .createdAt(LocalDateTime.now())
            .build();

        Task savedTask = taskRepository.save(task);
        // Notifica os estudantes da sala
        notificationService.notifyClassroom(
            classroom.getId(),
            savedTask.getId(),
            "Nova tarefa: " + savedTask.getTitle(),
            "TAREFA"
        );
        TaskSimpleDTO dtoResp = new TaskSimpleDTO(
            savedTask.getId(),
            savedTask.getTitle(),
            savedTask.getDescription(),
            savedTask.getDueDate(),
            savedTask.getType(),
            classroom.getId(),
            classroom.getName(),
            classroom.getAcademicYear(),
            savedTask.getDiscipline()
        );
        return ResponseEntity.ok(dtoResp);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<Task> updateTask(@PathVariable Long id, @RequestBody TaskDTO taskDTO, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        Task existingTask = taskRepository.findById(id).orElse(null);
        if (existingTask == null) {
            return ResponseEntity.notFound().build();
        }

        // Bloqueio: se já houver submissões, não permite edição
        if (!submissionRepository.findByTaskId(id).isEmpty()) {
            return ResponseEntity.status(409).body(null);
        }

        // Verifica se o professor tem acesso à tarefa
        if (user.getRole() == Role.TEACHER) {
            boolean hasAccess = user.getClassroomsAsTeacher().stream()
                .anyMatch(classroom -> classroom.getTasks().contains(existingTask));
            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }
        }

        // Atualiza apenas os campos enviados
        if (taskDTO.getTitle() != null) existingTask.setTitle(taskDTO.getTitle());
        if (taskDTO.getDescription() != null) existingTask.setDescription(taskDTO.getDescription());
        if (taskDTO.getDueDate() != null) existingTask.setDueDate(taskDTO.getDueDate());
        if (taskDTO.getType() != null) existingTask.setType(taskDTO.getType());
        if (taskDTO.getDiscipline() != null) existingTask.setDiscipline(taskDTO.getDiscipline());

        Task updatedTask = taskRepository.save(existingTask);
        return ResponseEntity.ok(updatedTask);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> deleteTask(@PathVariable Long id, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        Task task = taskRepository.findById(id).orElse(null);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }

        // Verifica se a tarefa possui submissões
        if (!submissionRepository.findByTaskId(id).isEmpty()) {
            return ResponseEntity.status(409).body("Não é possível excluir a tarefa pois já existem respostas/submissões de alunos.");
        }

        // Verifica se o professor tem acesso à tarefa
        if (user.getRole() == Role.TEACHER) {
            boolean hasAccess = user.getClassroomsAsTeacher().stream()
                .anyMatch(classroom -> classroom.getTasks().contains(task));
            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }
        }

        taskRepository.delete(task);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/classroom/{classroomId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TaskSimpleDTO>> getTasksByClassroom(@PathVariable Long classroomId, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }
        Classroom classroom = classroomRepository.findById(classroomId).orElse(null);
        if (classroom == null) {
            return ResponseEntity.notFound().build();
        }
        boolean hasAccess = user.getRole() == Role.ADMIN
            || (user.getRole() == Role.TEACHER && user.getClassroomsAsTeacher().contains(classroom))
            || (user.getRole() == Role.STUDENT && user.getClassrooms().contains(classroom));
        if (!hasAccess) {
            return ResponseEntity.status(403).build();
        }
        List<TaskSimpleDTO> dtos = classroom.getTasks().stream()
            .map(task -> new TaskSimpleDTO(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getDueDate(),
                task.getType(),
                classroom.getId(),
                classroom.getName(),
                classroom.getAcademicYear(),
                task.getDiscipline()
            ))
            .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/tasks-by-classroom")
    public ResponseEntity<Map<String, Object>> getTasksByClassroom(Authentication authentication) {
        // ...
        return null; // Placeholder return, actual implementation needed
    }

    // Endpoints para anexos de tarefas
    @PostMapping("/{taskId}/attachments")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<TaskAttachmentDTO> uploadTaskAttachment(
            @PathVariable Long taskId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (user == null) {
                return ResponseEntity.badRequest().build();
            }

            Task task = taskRepository.findById(taskId).orElse(null);
            if (task == null) {
                return ResponseEntity.notFound().build();
            }

            // Verifica se o usuário tem acesso à tarefa
            boolean hasAccess = false;
            if (user.getRole() == Role.ADMIN) {
                hasAccess = true;
            } else if (user.getRole() == Role.TEACHER) {
                hasAccess = user.getClassroomsAsTeacher().stream()
                    .anyMatch(classroom -> classroom.getTasks().contains(task));
            }

            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }

            // Validação do arquivo
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(null);
            }

            if (!ALLOWED_FILE_TYPES.contains(file.getContentType())) {
                return ResponseEntity.badRequest().body(null);
            }

            if (file.getSize() > MAX_FILE_SIZE) {
                return ResponseEntity.badRequest().body(null);
            }

            // Salvar arquivo
            String uploadDir = "uploads/";
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path path = Paths.get(uploadDir + fileName);
            Files.createDirectories(path.getParent());
            Files.write(path, file.getBytes());
            String fileUrl = "/files/" + fileName;

            // Criar anexo
            TaskAttachment attachment = TaskAttachment.builder()
                .task(task)
                .fileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .fileType(file.getContentType())
                .fileUrl(fileUrl)
                .uploadedAt(LocalDateTime.now())
                .build();

            TaskAttachment savedAttachment = taskAttachmentRepository.save(attachment);

            TaskAttachmentDTO dto = new TaskAttachmentDTO(
                savedAttachment.getId(),
                savedAttachment.getFileName(),
                savedAttachment.getFileSize(),
                savedAttachment.getFileType(),
                savedAttachment.getFileUrl(),
                savedAttachment.getUploadedAt().toString()
            );

            return ResponseEntity.ok(dto);

        } catch (IOException e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{taskId}/attachments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TaskAttachmentDTO>> getTaskAttachments(
            @PathVariable Long taskId,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }

        // Verifica se o usuário tem acesso à tarefa
        boolean hasAccess = false;
        if (user.getRole() == Role.ADMIN) {
            hasAccess = true;
        } else if (user.getRole() == Role.TEACHER) {
            hasAccess = user.getClassroomsAsTeacher().stream()
                .anyMatch(classroom -> classroom.getTasks().contains(task));
        } else {
            hasAccess = user.getClassrooms().stream()
                .anyMatch(classroom -> classroom.getTasks().contains(task));
        }

        if (!hasAccess) {
            return ResponseEntity.status(403).build();
        }

        List<TaskAttachment> attachments = taskAttachmentRepository.findByTaskId(taskId);
        List<TaskAttachmentDTO> dtos = attachments.stream()
            .map(attachment -> new TaskAttachmentDTO(
                attachment.getId(),
                attachment.getFileName(),
                attachment.getFileSize(),
                attachment.getFileType(),
                attachment.getFileUrl(),
                attachment.getUploadedAt().toString()
            ))
            .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @DeleteMapping("/{taskId}/attachments/{attachmentId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> deleteTaskAttachment(
            @PathVariable Long taskId,
            @PathVariable Long attachmentId,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        TaskAttachment attachment = taskAttachmentRepository.findById(attachmentId).orElse(null);
        if (attachment == null || !attachment.getTask().getId().equals(taskId)) {
            return ResponseEntity.notFound().build();
        }

        // Verifica se o usuário tem acesso à tarefa
        boolean hasAccess = false;
        if (user.getRole() == Role.ADMIN) {
            hasAccess = true;
        } else if (user.getRole() == Role.TEACHER) {
            hasAccess = user.getClassroomsAsTeacher().stream()
                .anyMatch(classroom -> classroom.getTasks().contains(attachment.getTask()));
        }

        if (!hasAccess) {
            return ResponseEntity.status(403).build();
        }

        taskAttachmentRepository.delete(attachment);
        return ResponseEntity.ok().build();
    }
}