package com.eaduck.backend.model.dummy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;


/**
 * Entity that represents a customer.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Builder
public class Dummy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private Boolean status;
}
