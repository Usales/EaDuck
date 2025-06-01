package com.eaduck.backend.model.auth.dto;

import com.eaduck.backend.model.enums.Role;
import lombok.Data;

@Data
public class UserActivationDTO {
    private Long userId;
    private boolean isActive;
    private Role role; // Para confirmar ou atualizar o role
}