package com.template.backend.repository;

import com.template.backend.model.dummy.Dummy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

/**
 * Repository interface for database operations related to the Customer entity.
 * Extends JpaRepository.
 */
public interface DummyRepository extends JpaRepository<Dummy, Long> {

    /**
     * Finds all active customers.
     *
     * @return List of active customers.
     */
    @Query(value = "SELECT * FROM dummy WHERE status = true", nativeQuery = true)
    List<Dummy> findAllDummies();
}
