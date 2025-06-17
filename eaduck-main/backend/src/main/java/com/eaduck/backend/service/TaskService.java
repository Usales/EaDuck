package com.eaduck.backend.service;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.model.task.dto.TaskDTO;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.ClassroomRepository;
import com.eaduck.backend.repository.TaskRepository;
import com.eaduck.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class TaskService {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private JavaMailSender mailSender;

    public Task createTask(TaskDTO dto, Long creatorId) {
        Optional<Classroom> classroomOpt = classroomRepository.findById(dto.getClassroomId());
        Optional<User> creatorOpt = userRepository.findById(creatorId);

        if (!classroomOpt.isPresent()) {
            throw new RuntimeException("Turma não encontrada.");
        }
        if (!creatorOpt.isPresent()) {
            throw new RuntimeException("Usuário criador não encontrado.");
        }

        Task task = Task.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .dueDate(dto.getDueDate())
                .classroom(classroomOpt.get())
                .createdBy(creatorOpt.get())
                .createdAt(LocalDateTime.now())
                .type(dto.getType())
                .build();

        task = taskRepository.save(task);

        // Disparar notificações para todos os alunos da turma
        String message = "Nova tarefa: " + task.getTitle() + ". Prazo: " + (task.getDueDate() != null ? task.getDueDate() : "Sem prazo definido");
        notificationService.notifyClassroom(dto.getClassroomId(), task.getId(), message, "TASK_ASSIGNED");

        // Enviar e-mail para todos os alunos da turma
        Classroom classroom = classroomOpt.get();
        for (User student : classroom.getStudents()) {
            SimpleMailMessage email = new SimpleMailMessage();
            email.setTo(student.getEmail());
            email.setSubject("Nova atividade disponível: " + task.getTitle());
            email.setText("Olá, uma nova atividade foi publicada na turma " + classroom.getName() + ".\nTítulo: " + task.getTitle() + "\nDescrição: " + task.getDescription() + "\nPrazo: " + (task.getDueDate() != null ? task.getDueDate() : "Sem prazo definido"));
            mailSender.send(email);
        }

        return task;
    }
}