package com.eaduck.backend.model.discipline.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisciplineUpdateDTO {
    private String name;
    private String description;
    private Boolean isActive;
}

