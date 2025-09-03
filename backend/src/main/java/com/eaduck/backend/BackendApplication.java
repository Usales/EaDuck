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
				User admin = new User();
				// Usando reflexão para definir os campos já que o Lombok não está funcionando
				try {
					java.lang.reflect.Field emailField = User.class.getDeclaredField("email");
					emailField.setAccessible(true);
					emailField.set(admin, adminEmail);
					
					java.lang.reflect.Field nameField = User.class.getDeclaredField("name");
					nameField.setAccessible(true);
					nameField.set(admin, "Administrador EaDuck");
					
					java.lang.reflect.Field passwordField = User.class.getDeclaredField("password");
					passwordField.setAccessible(true);
					passwordField.set(admin, passwordEncoder.encode("admin123"));
					
					java.lang.reflect.Field roleField = User.class.getDeclaredField("role");
					roleField.setAccessible(true);
					roleField.set(admin, Role.ADMIN);
					
					java.lang.reflect.Field isActiveField = User.class.getDeclaredField("isActive");
					isActiveField.setAccessible(true);
					isActiveField.set(admin, true);
				} catch (Exception e) {
					throw new RuntimeException("Erro ao criar usuário admin", e);
				}
				userRepository.save(admin);
				System.out.println("Usuário administrador padrão criado: " + adminEmail);
			} else {
				System.out.println("Usuário administrador padrão já existe: " + adminEmail);
			}
		};
	}
}
