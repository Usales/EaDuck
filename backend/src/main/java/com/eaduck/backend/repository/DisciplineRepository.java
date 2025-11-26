package com.eaduck.backend.repository;

import com.eaduck.backend.model.discipline.Discipline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DisciplineRepository extends JpaRepository<Discipline, Long> {
    Optional<Discipline> findByName(String name);
    List<Discipline> findByIsActiveTrue();
    List<Discipline> findByIsActive(Boolean isActive);
}

