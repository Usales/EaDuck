package com.eaduck.backend.controller;

import com.eaduck.backend.service.EmailConfirmationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/email-confirmation")
@CrossOrigin(origins = "http://localhost:4200")
public class EmailConfirmationController {

    @Autowired
    private EmailConfirmationService emailConfirmationService;

    /**
     * Envia código de confirmação para o e-mail
     */
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendConfirmationCode(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("E-mail é obrigatório"));
            }

            // Processa o envio do código
            String code = emailConfirmationService.processEmailConfirmation(email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Código de confirmação enviado com sucesso");
            response.put("email", email);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace(); // Log do erro
            return ResponseEntity.internalServerError()
                .body(createErrorResponse("Erro ao enviar código de confirmação: " + e.getMessage()));
        }
    }

    /**
     * Verifica se o código de confirmação é válido
     */
    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyConfirmationCode(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String code = request.get("code");
            
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("E-mail é obrigatório"));
            }
            
            if (code == null || code.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("Código é obrigatório"));
            }

            // Verifica o código
            boolean isValid = emailConfirmationService.verifyConfirmationCode(email, code);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("valid", isValid);
            response.put("message", isValid ? "Código válido" : "Código inválido ou expirado");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(createErrorResponse("Erro ao verificar código: " + e.getMessage()));
        }
    }

    /**
     * Reenvia código de confirmação
     */
    @PostMapping("/resend")
    public ResponseEntity<Map<String, Object>> resendConfirmationCode(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("E-mail é obrigatório"));
            }

            // Remove código anterior se existir
            emailConfirmationService.removeConfirmationCode(email);
            
            // Gera e envia novo código
            String code = emailConfirmationService.processEmailConfirmation(email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Novo código de confirmação enviado");
            response.put("email", email);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(createErrorResponse("Erro ao reenviar código: " + e.getMessage()));
        }
    }


    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }
}
