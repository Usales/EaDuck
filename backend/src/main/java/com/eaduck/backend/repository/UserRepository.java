package com.eaduck.backend.repository;

import com.eaduck.backend.model.enums.Role;
import com.eaduck.backend.model.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    
    @Override
    @NonNull
    Optional<User> findById(@NonNull Long id);

    List<User> findByRole(Role role);
}