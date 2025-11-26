package com.eaduck.backend.controller;

import com.eaduck.backend.model.discipline.Discipline;
import com.eaduck.backend.model.discipline.dto.DisciplineCreateDTO;
import com.eaduck.backend.model.discipline.dto.DisciplineDTO;
import com.eaduck.backend.model.discipline.dto.DisciplineUpdateDTO;
import com.eaduck.backend.model.enums.Role;
import com.eaduck.backend.model.user.User;
import com.eaduck.backend.repository.DisciplineRepository;
import com.eaduck.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/disciplines")
public class DisciplineController {

    private static final Logger logger = LoggerFactory.getLogger(DisciplineController.class);

    @Autowired
    private DisciplineRepository disciplineRepository;

    @Autowired
    private UserRepository userRepository;

    private DisciplineDTO toDTO(Discipline discipline) {
        return DisciplineDTO.builder()
                .id(discipline.getId())
                .name(discipline.getName())
                .description(discipline.getDescription())
                .isActive(discipline.getIsActive())
                .createdAt(discipline.getCreatedAt())
                .updatedAt(discipline.getUpdatedAt())
                .build();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    public ResponseEntity<List<DisciplineDTO>> getAllDisciplines(
            @RequestParam(required = false) Boolean active) {
        try {
            List<Discipline> disciplines;
            if (active != null) {
                disciplines = disciplineRepository.findByIsActive(active);
            } else {
                disciplines = disciplineRepository.findAll();
            }
            
            List<DisciplineDTO> dtos = disciplines.stream()
                    .map(this::toDTO)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            logger.error("Erro ao buscar disciplinas: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    public ResponseEntity<DisciplineDTO> getDisciplineById(@PathVariable Long id) {
        try {
            Discipline discipline = disciplineRepository.findById(id)
                    .orElse(null);
            
            if (discipline == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(toDTO(discipline));
        } catch (Exception e) {
            logger.error("Erro ao buscar disciplina: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<?> createDiscipline(
            @RequestBody DisciplineCreateDTO dto,
            Authentication authentication) {
        try {
            User currentUser = userRepository.findByEmail(authentication.getName())
                    .orElse(null);
            
            if (currentUser == null) {
                return ResponseEntity.status(403).build();
            }

            // Verificar se já existe disciplina com o mesmo nome
            if (disciplineRepository.findByName(dto.getName()).isPresent()) {
                return ResponseEntity.badRequest()
                        .body(java.util.Map.of("error", "Já existe uma disciplina com este nome"));
            }

            Discipline discipline = Discipline.builder()
                    .name(dto.getName())
                    .description(dto.getDescription())
                    .isActive(true)
                    .build();

            Discipline saved = disciplineRepository.save(discipline);
            logger.info("Disciplina criada: {} por {}", saved.getName(), currentUser.getEmail());

            return ResponseEntity.ok(toDTO(saved));
        } catch (Exception e) {
            logger.error("Erro ao criar disciplina: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body(java.util.Map.of("error", "Erro ao criar disciplina: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<?> updateDiscipline(
            @PathVariable Long id,
            @RequestBody DisciplineUpdateDTO dto,
            Authentication authentication) {
        try {
            User currentUser = userRepository.findByEmail(authentication.getName())
                    .orElse(null);
            
            if (currentUser == null) {
                return ResponseEntity.status(403).build();
            }

            Discipline discipline = disciplineRepository.findById(id)
                    .orElse(null);

            if (discipline == null) {
                return ResponseEntity.notFound().build();
            }

            // Verificar se o novo nome já existe em outra disciplina
            if (dto.getName() != null && !dto.getName().equals(discipline.getName())) {
                if (disciplineRepository.findByName(dto.getName()).isPresent()) {
                    return ResponseEntity.badRequest()
                            .body(java.util.Map.of("error", "Já existe uma disciplina com este nome"));
                }
            }

            // Atualizar campos
            if (dto.getName() != null) {
                discipline.setName(dto.getName());
            }
            if (dto.getDescription() != null) {
                discipline.setDescription(dto.getDescription());
            }
            if (dto.getIsActive() != null) {
                discipline.setIsActive(dto.getIsActive());
            }

            Discipline saved = disciplineRepository.save(discipline);
            logger.info("Disciplina atualizada: {} por {}", saved.getName(), currentUser.getEmail());

            return ResponseEntity.ok(toDTO(saved));
        } catch (Exception e) {
            logger.error("Erro ao atualizar disciplina: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body(java.util.Map.of("error", "Erro ao atualizar disciplina: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteDiscipline(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            User currentUser = userRepository.findByEmail(authentication.getName())
                    .orElse(null);
            
            if (currentUser == null) {
                return ResponseEntity.status(403).build();
            }

            Discipline discipline = disciplineRepository.findById(id)
                    .orElse(null);

            if (discipline == null) {
                return ResponseEntity.notFound().build();
            }

            disciplineRepository.delete(discipline);
            logger.info("Disciplina deletada: {} por {}", discipline.getName(), currentUser.getEmail());

            return ResponseEntity.ok(java.util.Map.of("message", "Disciplina deletada com sucesso"));
        } catch (Exception e) {
            logger.error("Erro ao deletar disciplina: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body(java.util.Map.of("error", "Erro ao deletar disciplina: " + e.getMessage()));
        }
    }
}

