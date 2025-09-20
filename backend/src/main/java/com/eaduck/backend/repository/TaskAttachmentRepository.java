package com.eaduck.backend.repository;

import com.eaduck.backend.model.task.TaskAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment, Long> {
    List<TaskAttachment> findByTaskId(Long taskId);
    void deleteByTaskId(Long taskId);
}