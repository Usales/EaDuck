package com.eaduck.backend.controller;

import com.eaduck.backend.model.auth.dto.AuthRequest;
import com.eaduck.backend.model.auth.dto.AuthResponse;
import com.eaduck.backend.model.auth.dto.ValidateTokenRequest;
import com.eaduck.backend.model.auth.dto.ResponseMessage;
import com.eaduck.backend.model.auth.dto.ConfirmResetPasswordRequest;
import com.eaduck.backend.model.enums.Role;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.config.security.JwtService;
import com.eaduck.backend.exceptions.DuplicateEmailException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        System.out.println("Requisição de registro para: " + request.getEmail());
        try {
            if (request.getEmail() == null || request.getPassword() == null || request.getEmail().isEmpty() || request.getPassword().isEmpty()) {
                return ResponseEntity.badRequest().body(new ResponseMessage("E-mail e senha são obrigatórios."));
            }
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new DuplicateEmailException("E-mail já cadastrado.");
            }
            User user = User.builder()
                    .email(request.getEmail())
                    .password(passwordEncoder.encode(request.getPassword()))
                    .role(Role.USER)
                    .build();
            userRepository.save(user);
            String token = jwtService.generateToken(user);
            return ResponseEntity.ok(new AuthResponse(token));
        } catch (DuplicateEmailException e) {
            System.out.println("Erro ao registrar: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ResponseMessage(e.getMessage()));
        } catch (Exception e) {
            System.out.println("Erro ao registrar: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ResponseMessage("Erro ao registrar: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        System.out.println("Requisição de login para: " + request.getEmail());
        try {
            if (request.getEmail() == null || request.getPassword() == null || request.getEmail().isEmpty() || request.getPassword().isEmpty()) {
                return ResponseEntity.badRequest().body(new ResponseMessage("E-mail e senha são obrigatórios."));
            }
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + request.getEmail()));
            String token = jwtService.generateToken(user);
            return ResponseEntity.ok(new AuthResponse(token));
        } catch (BadCredentialsException e) {
            System.out.println("Credenciais inválidas para: " + request.getEmail());
            return ResponseEntity.status(401).body(new ResponseMessage("Credenciais inválidas."));
        } catch (Exception e) {
            System.out.println("Erro ao autenticar: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ResponseMessage("Erro ao autenticar: " + e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        System.out.println("Requisição de redefinição para: " + request.getEmail());
        try {
            if (request.getEmail() == null || request.getEmail().isEmpty()) {
                return ResponseEntity.badRequest().body(new ResponseMessage("E-mail é obrigatório."));
            }
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + request.getEmail()));
            String resetToken = jwtService.generateToken(user);
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject("Redefinição de Senha EaDuck");
            message.setText("Clique no link para redefinir sua senha: http://localhost:4200/confirm-reset-password?token=" + resetToken);
            mailSender.send(message);
            return ResponseEntity.ok(new ResponseMessage("Link de redefinição enviado para: " + user.getEmail()));
        } catch (Exception e) {
            System.out.println("Erro ao redefinir senha: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ResponseMessage("Erro ao redefinir senha: " + e.getMessage()));
        }
    }

    @PostMapping("/confirm-reset-password")
    public ResponseEntity<?> confirmResetPassword(@RequestBody ConfirmResetPasswordRequest request) {
        System.out.println("Requisição de confirmação de redefinição de senha");
        try {
            if (request.getToken() == null || request.getToken().isEmpty() || request.getNewPassword() == null || request.getNewPassword().isEmpty()) {
                return ResponseEntity.badRequest().body(new ResponseMessage("Token e nova senha são obrigatórios."));
            }
            // Validar o token
            String email = jwtService.extractUsername(request.getToken());
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + email));
            if (!jwtService.isTokenValid(request.getToken(), user)) {
                return ResponseEntity.badRequest().body(new ResponseMessage("Token inválido ou expirado."));
            }
            // Atualizar a senha
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            userRepository.save(user);
            return ResponseEntity.ok(new ResponseMessage("Senha redefinida com sucesso."));
        } catch (Exception e) {
            System.out.println("Erro ao redefinir senha: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ResponseMessage("Erro ao redefinir senha: " + e.getMessage()));
        }
    }

    @PostMapping("/validate-token")
    public ResponseEntity<?> validateToken(@RequestBody ValidateTokenRequest request) {
        try {
            boolean isValid = jwtService.validateToken(request.getToken());
            if (!isValid) {
                return ResponseEntity.status(401).body(new ResponseMessage("Token inválido."));
            }
            return ResponseEntity.ok(true);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(new ResponseMessage("Token inválido: " + e.getMessage()));
        }
    }
}

class LoginRequest {
    private String email;
    private String password;
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}

class ResetPasswordRequest {
    private String email;
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}