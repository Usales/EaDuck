package com.eaduck.backend.model.auth.dto;

import com.eaduck.backend.model.enums.Role;
import lombok.Data;

@Data
public class UserRegisterDTO {
    private String email;
    private String password;
    private Role role; // STUDENT, TEACHER, ADMIN
}