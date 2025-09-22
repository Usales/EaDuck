package com.eaduck.backend.config;

import com.eaduck.backend.model.enums.Role;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Verificar se já existe um usuário admin
        if (userRepository.findByEmail("compeaduck@gmail.com").isEmpty()) {
            User admin = User.builder()
                    .email("compeaduck@gmail.com")
                    .password(passwordEncoder.encode("admin123"))
                    .role(Role.ADMIN)
                    .isActive(true)
                    .name(null) // Nome será definido no primeiro login
                    .build();
            
            userRepository.save(admin);
            System.out.println("Usuário admin criado: compeaduck@gmail.com");
        }
    }
}
