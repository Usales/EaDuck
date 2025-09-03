package com.eaduck.backend.model.classroom.dto;

import lombok.Data;
import java.util.List;

@Data
public class ClassroomCreateDTO {
    private String name;
    private String academicYear;
    private List<Long> teacherIds;
} 