package com.eaduck.backend.model.classroom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassroomDTO {
    private Long id;
    private String name;
    private String academicYear;
    private List<Long> teacherIds;
    private List<String> teacherNames;
    private int studentCount;
    private List<Long> studentIds;
    private List<String> studentNames;
    private boolean active;
} 