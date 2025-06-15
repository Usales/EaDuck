package com.eaduck.backend.service;

import com.eaduck.backend.config.security.JwtService;
import com.eaduck.backend.exceptions.DuplicateEmailException;
import com.eaduck.backend.exceptions.ObjectNotFoundException;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.model.auth.dto.UserActivationDTO;
import com.eaduck.backend.model.auth.dto.UserRegisterDTO;
import com.eaduck.backend.model.enums.Role;
import com.eaduck.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private JavaMailSender mailSender;

    public User register(UserRegisterDTO dto) {
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new DuplicateEmailException("Email já registrado: " + dto.getEmail());
        }

        User user = new User();
        user.setEmail(dto.getEmail());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setRole(Role.STUDENT); // Definir STUDENT por padrão
        user.setActive(true); // Garantir usuário ativo
        return userRepository.save(user);
    }

    public String authenticate(String email, String password) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );
        User user = findByEmail(email);
        return jwtService.generateToken(user);
    }

    public User activateUser(UserActivationDTO dto) {
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado: " + dto.getUserId()));
        if (dto.getRole() != null) {
            user.setRole(dto.getRole());
        }
        user.setActive(dto.isActive());
        return userRepository.save(user);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ObjectNotFoundException("Usuário não encontrado: " + email));
    }

    public void sendResetPasswordEmail(String email) {
        User user = findByEmail(email);
        String resetToken = jwtService.generateToken(user);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(user.getEmail());
        message.setSubject("Redefinição de Senha EaDuck");
        message.setText("Clique no link para redefinir sua senha: http://localhost:4200/confirm-reset-password?token=" + resetToken);
        mailSender.send(message);
    }

    public void confirmResetPassword(String token, String newPassword) {
        String email = jwtService.extractUsername(token);
        User user = findByEmail(email);
        if (!jwtService.isTokenValid(token, user)) {
            throw new IllegalArgumentException("Token inválido ou expirado.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public boolean validateToken(String token) {
        try {
            String email = jwtService.extractUsername(token);
            User user = findByEmail(email);
            return jwtService.isTokenValid(token, user);
        } catch (Exception e) {
            return false;
        }
    }
}