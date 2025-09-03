package com.eaduck.backend.service;

import com.eaduck.backend.model.submission.Submission;
import com.eaduck.backend.model.submission.dto.SubmissionDTO;
import com.eaduck.backend.repository.SubmissionRepository;
import com.eaduck.backend.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SubmissionService {
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;

    public SubmissionService(SubmissionRepository submissionRepository, UserRepository userRepository) {
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
    }

    public List<SubmissionDTO> getMySubmissions() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        var user = userRepository.findByEmail(email).orElseThrow();
        List<Submission> submissions = submissionRepository.findByStudentId(user.getId());
        return submissions.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<SubmissionDTO> getAllSubmissions() {
        List<Submission> submissions = submissionRepository.findAll();
        return submissions.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
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
        return dto;
    }
} 