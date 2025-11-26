package com.eaduck.backend.model.user.dto;

import com.eaduck.backend.model.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long id;
    private String email;
    private String name; // Apelido/Nickname
    private String nomeCompleto;
    private String cpf;
    private String dataNascimento;
    private String nomeMae;
    private String nomePai;
    private String telefone;
    private String endereco;
    private String titulacao;
    private Role role;
    private boolean isActive;
} 