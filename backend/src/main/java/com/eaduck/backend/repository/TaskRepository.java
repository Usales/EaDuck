package com.eaduck.backend.repository;

import com.eaduck.backend.model.task.Task;
import com.eaduck.backend.model.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByClassroomId(Long classroomId);
    List<Task> findByCreatedBy(User createdBy);
}