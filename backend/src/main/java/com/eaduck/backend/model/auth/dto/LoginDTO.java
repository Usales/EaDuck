package com.eaduck.backend.model.auth.dto;

import lombok.Data;

@Data
public class LoginDTO {
    private String email;
    private String password;
}
