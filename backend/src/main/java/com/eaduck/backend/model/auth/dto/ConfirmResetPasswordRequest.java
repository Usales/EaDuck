package com.eaduck.backend.model.auth.dto;

import lombok.Data;

@Data
public class ConfirmResetPasswordRequest {
    private String token;
    private String newPassword;
}
