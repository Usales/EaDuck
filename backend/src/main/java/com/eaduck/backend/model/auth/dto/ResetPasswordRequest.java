package com.eaduck.backend.model.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    private String email;
}