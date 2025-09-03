package com.eaduck.backend.model.classroom;

import com.eaduck.backend.model.user.User;
import com.eaduck.backend.model.task.Task;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.Objects;

@Entity
@Table(name = "classrooms")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Classroom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "academic_year")
    private String academicYear;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @ManyToMany
    @JoinTable(
            name = "classroom_students",
            joinColumns = @JoinColumn(name = "classroom_id"),
            inverseJoinColumns = @JoinColumn(name = "student_id")
    )
    @com.fasterxml.jackson.annotation.JsonManagedReference("student-classroom")
    private Set<User> students = new HashSet<>();

    @ManyToMany
    @JoinTable(
            name = "classroom_teachers",
            joinColumns = @JoinColumn(name = "classroom_id"),
            inverseJoinColumns = @JoinColumn(name = "teacher_id")
    )
    private Set<User> teachers = new HashSet<>();

    @ManyToMany(mappedBy = "teachers")
    private Set<Classroom> classroomsAsTeacher;

    @OneToMany(mappedBy = "classroom", cascade = CascadeType.ALL)
    @JsonManagedReference("classroom-tasks")
    private Set<Task> tasks = new HashSet<>();

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Classroom classroom = (Classroom) o;
        return Objects.equals(id, classroom.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}