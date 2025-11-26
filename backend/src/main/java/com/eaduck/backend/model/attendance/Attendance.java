package com.eaduck.backend.model.attendance;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.model.enums.AttendanceStatus;
import com.eaduck.backend.model.enums.Period;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "attendances", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"classroom_id", "student_id", "date"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Attendance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus status;

    @Column(name = "arrival_time")
    private LocalTime arrivalTime; // Horário de chegada (se atrasado)

    @Column(columnDefinition = "TEXT")
    private String observations; // Observações / Justificativa

    @Column(name = "discipline")
    private String discipline; // Disciplina (opcional)

    @Enumerated(EnumType.STRING)
    @Column(name = "period")
    private Period period; // Período (Manhã / Tarde / Integral)

    @ManyToOne
    @JoinColumn(name = "teacher_id")
    private User teacher; // Professor responsável
}

