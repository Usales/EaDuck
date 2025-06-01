package com.eaduck.backend.controller;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.enums.Role;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/me/classrooms")
    public ResponseEntity<Set<Classroom>> getUserClassrooms(Authentication authentication) {
        Long userId = Long.valueOf(authentication.getName());
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            return ResponseEntity.ok(userOpt.get().getClassrooms());
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getUsersByRole(@RequestParam String role) {
        try {
            Role roleEnum = Role.valueOf(role.toUpperCase());
            return ResponseEntity.ok(userRepository.findByRole(roleEnum));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }
}