package com.eaduck.backend.model.auth.dto;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    private String email;
}