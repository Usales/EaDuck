package com.eaduck.backend;

import com.eaduck.backend.model.enums.Role;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner createAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		return args -> {
			String adminEmail = "compeaduck@gmail.com";
			if (userRepository.findByEmail(adminEmail).isEmpty()) {
				User admin = User.builder()
					.email(adminEmail)
					.password(passwordEncoder.encode("admin123"))
					.role(Role.ADMIN)
					.isActive(true)
					.build();
				userRepository.save(admin);
				System.out.println("Usuário administrador padrão criado: " + adminEmail);
			} else {
				System.out.println("Usuário administrador padrão já existe: " + adminEmail);
			}
		};
	}
}
