package com.eaduck.backend.model.classroom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassroomDTO {
    private Long id;
    private String name;
    private String academicYear;
    private Long teacherId;
    private String teacherName;
    private int studentCount;
} 