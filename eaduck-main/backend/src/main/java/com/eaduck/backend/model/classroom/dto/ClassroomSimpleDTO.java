package com.eaduck.backend.model.classroom.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ClassroomSimpleDTO {
    private Long id;
    private String name;
    private String academicYear;
} 