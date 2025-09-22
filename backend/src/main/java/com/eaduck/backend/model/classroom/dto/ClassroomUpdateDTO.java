package com.eaduck.backend.model.classroom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassroomUpdateDTO {
    private String name;
    private String academicYear;
    private Boolean isActive;
}
