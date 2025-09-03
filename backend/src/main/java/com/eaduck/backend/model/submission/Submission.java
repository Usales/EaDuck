package com.eaduck.backend.model.submission;

import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.model.user.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "submissions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Submission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "grade")
    private Double grade;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "evaluated_at")
    private java.time.LocalDateTime evaluatedAt;
} 