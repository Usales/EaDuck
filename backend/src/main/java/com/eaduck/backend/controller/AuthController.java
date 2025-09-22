package com.eaduck.backend.controller;

import com.eaduck.backend.model.auth.dto.*;
import com.eaduck.backend.model.enums.Role;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.UserRepository;
import com.eaduck.backend.config.security.JwtService;
import com.eaduck.backend.exceptions.DuplicateEmailException;
import com.eaduck.backend.service.EmailConfirmationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final EmailConfirmationService emailConfirmationService;

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UserRegisterDTO request) {
        try {
            if (request.getEmail() == null || request.getPassword() == null || request.getEmail().isEmpty() || request.getPassword().isEmpty()) {
                return ResponseEntity.badRequest().body(new ResponseMessage("E-mail e senha são obrigatórios."));
            }
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new DuplicateEmailException("E-mail já cadastrado.");
            }
            if (request.getRole() == null) {
                request.setRole(Role.STUDENT); // Definindo STUDENT (ALUNO) como padrão
            }
            User user = User.builder()
                    .email(request.getEmail())
                    .password(passwordEncoder.encode(request.getPassword()))
                    .role(request.getRole())
                    .isActive(true) // Usuário começa ativo
                    .name(request.getEmail().split("@")[0].replaceAll("\\d", ""))
                    .build();
            user = userRepository.save(user);
            String token = jwtService.generateToken(user);
            return ResponseEntity.ok(new AuthResponse(token, String.valueOf(user.getId()), user.getRole().name()));
        } catch (DuplicateEmailException e) {
            logger.error("Erro ao registrar: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ResponseMessage(e.getMessage()));
        } catch (Exception e) {
            logger.error("Erro ao registrar: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ResponseMessage("Erro ao registrar: " + e.getMessage()));
        }
    }

    @PostMapping("/register-with-confirmation")
    public ResponseEntity<?> registerWithConfirmation(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String password = request.get("password");
            String confirmationCode = request.get("confirmationCode");
            
            if (email == null || password == null || confirmationCode == null || 
                email.isEmpty() || password.isEmpty() || confirmationCode.isEmpty()) {
                return ResponseEntity.badRequest().body(new ResponseMessage("E-mail, senha e código de confirmação são obrigatórios."));
            }
            
            if (userRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body(new ResponseMessage("E-mail já cadastrado."));
            }
            
            // Verificar código de confirmação
            if (!emailConfirmationService.verifyConfirmationCode(email, confirmationCode)) {
                return ResponseEntity.badRequest().body(new ResponseMessage("Código de confirmação inválido ou expirado."));
            }
            
            // Criar usuário
            User user = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode(password))
                    .role(Role.STUDENT)
                    .isActive(true)
                    .name(email.split("@")[0].replaceAll("\\d", ""))
                    .build();
            
            user = userRepository.save(user);
            
            // Consumir o código após registro bem-sucedido
            emailConfirmationService.consumeConfirmationCode(email);
            
            String token = jwtService.generateToken(user);
            
            return ResponseEntity.ok(new AuthResponse(token, String.valueOf(user.getId()), user.getRole().name()));
            
        } catch (Exception e) {
            logger.error("Erro ao registrar com confirmação: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ResponseMessage("Erro ao registrar: " + e.getMessage()));
        }
    }

    @PostMapping("/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> activateUser(@RequestBody UserActivationDTO request) {
        try {
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado."));
            if (request.getRole() == null) {
                return ResponseEntity.badRequest().body(new ResponseMessage("Role é obrigatório."));
            }
            user.setActive(request.isActive());
            user.setRole(request.getRole());
            userRepository.save(user);
            return ResponseEntity.ok(new ResponseMessage("Usuário atualizado com sucesso."));
        } catch (RuntimeException e) {
            logger.error("Erro ao ativar usuário: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ResponseMessage(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            logger.info("Tentativa de login para email: {}", request.getEmail());
            logger.info("Request body: {}", request);
            
            if (request.getEmail() == null || request.getPassword() == null || request.getEmail().isEmpty() || request.getPassword().isEmpty()) {
                logger.warn("Email ou senha vazios");
                return ResponseEntity.badRequest().body(new ResponseMessage("E-mail e senha são obrigatórios."));
            }
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            User user = (User) authentication.getPrincipal();
            String token = jwtService.generateToken(user);
            return ResponseEntity.ok(new AuthResponse(token, String.valueOf(user.getId()), user.getRole().name()));
        } catch (DisabledException e) {
            return ResponseEntity.status(403).body(new ResponseMessage("Usuário inativo. Entre em contato com o administrador pelo e-mail compeaduck@gmail.com"));
        } catch (BadCredentialsException e) {
            logger.warn("Credenciais inválidas para: " + request.getEmail());
            return ResponseEntity.status(401).body(new ResponseMessage("Credenciais inválidas."));
        } catch (Exception e) {
            logger.error("Erro ao autenticar: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ResponseMessage("Erro ao autenticar: " + e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ResetPasswordRequest request) {
        logger.info("Requisição de esquecimento de senha para: " + request.getEmail());
        try {
            if (request.getEmail() == null || request.getEmail().isEmpty()) {
                return ResponseEntity.badRequest().body(new ResponseMessage("E-mail é obrigatório."));
            }
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + request.getEmail()));
            String resetToken = jwtService.generateToken(user);
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject("Esqueceu sua senha? EaDuck");
            message.setText("Clique no link para redefinir sua senha: http://localhost:4200/confirm-reset-password?token=" + resetToken);
            mailSender.send(message);
            return ResponseEntity.ok(new ResponseMessage("Link de redefinição enviado para: " + user.getEmail()));
        } catch (Exception e) {
            logger.error("Erro ao processar esquecimento de senha: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ResponseMessage("Erro ao processar esquecimento de senha: " + e.getMessage()));
        }
    }

    @PostMapping("/confirm-reset-password")
    public ResponseEntity<?> confirmResetPassword(@RequestBody ConfirmResetPasswordRequest request) {
        logger.info("Requisição de confirmação de redefinição de senha");
        try {
            if (request.getToken() == null || request.getToken().isEmpty() || request.getNewPassword() == null || request.getNewPassword().isEmpty()) {
                return ResponseEntity.badRequest().body(new ResponseMessage("Token e nova senha são obrigatórios."));
            }
            String email = jwtService.extractUsername(request.getToken());
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + email));
            if (!jwtService.isTokenValid(request.getToken(), user)) {
                return ResponseEntity.badRequest().body(new ResponseMessage("Token inválido ou expirado."));
            }
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            userRepository.save(user);
            return ResponseEntity.ok(new ResponseMessage("Senha redefinida com sucesso."));
        } catch (Exception e) {
            logger.error("Erro ao redefinir senha: " + e.getMessage());
            return ResponseEntity.badRequest().body(new ResponseMessage("Erro ao redefinir senha: " + e.getMessage()));
        }
    }


    @PostMapping("/validate-token")
    public ResponseEntity<?> validateToken(@RequestBody ValidateTokenRequest request) {
        logger.info("Validating token");
        try {
            String email = jwtService.extractUsername(request.getToken());
            if (email == null || userRepository.findByEmail(email).isEmpty()) {
                return ResponseEntity.status(401).body(new ResponseMessage("Token inválido."));
            }
            boolean isValid = jwtService.validateToken(request.getToken());
            if (!isValid) {
                return ResponseEntity.status(401).body(new ResponseMessage("Token inválido."));
            }
            return ResponseEntity.ok(true);
        } catch (Exception e) {
            logger.error("Error validating token: " + e.getMessage());
            return ResponseEntity.status(401).body(new ResponseMessage("Token inválido: " + e.getMessage()));
        }
    }

    @PostMapping("/activate-all")
    public ResponseEntity<?> activateAllUsers() {
        try {
            List<User> users = userRepository.findAll();
            for (User user : users) {
                user.setActive(true);
                userRepository.save(user);
            }
            return ResponseEntity.ok(new ResponseMessage("Todos os usuários foram ativados."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ResponseMessage("Erro ao ativar usuários: " + e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        try {
            String token = request.get("token");
            if (token == null || token.isEmpty()) {
                return ResponseEntity.badRequest().body(new ResponseMessage("Token não fornecido."));
            }

            String userEmail = jwtService.extractUsername(token);
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

            if (!jwtService.isTokenValid(token, user)) {
                return ResponseEntity.status(401).body(new ResponseMessage("Token inválido."));
            }

            String newToken = jwtService.generateToken(user);
            return ResponseEntity.ok(new AuthResponse(newToken, String.valueOf(user.getId()), user.getRole().name()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(new ResponseMessage("Erro ao renovar token: " + e.getMessage()));
        }
    }
}
