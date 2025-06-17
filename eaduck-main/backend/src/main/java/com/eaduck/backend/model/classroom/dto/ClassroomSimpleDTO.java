package com.eaduck.backend.model.classroom.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ClassroomSimpleDTO {
    private Long id;
    private String name;
    private String academicYear;
    private int studentCount;
    private List<String> teacherNames;
}