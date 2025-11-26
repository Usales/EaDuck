package com.eaduck.backend.model.user;

import com.eaduck.backend.model.classroom.Classroom;
import com.eaduck.backend.model.enums.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import jakarta.persistence.*;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.Objects;

@Entity
@Table(name = "users")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column
    private String name; // Apelido/Nickname

    @Column(name = "nome_completo")
    private String nomeCompleto;

    @Column(name = "cpf")
    private String cpf;

    @Column(name = "data_nascimento")
    private String dataNascimento; // Formato dd-MM-yyyy

    @Column(name = "nome_mae")
    private String nomeMae;

    @Column(name = "nome_pai")
    private String nomePai;

    @Column(name = "telefone")
    private String telefone;

    @Column(name = "endereco")
    private String endereco;

    @Column(name = "titulacao", length = 1000)
    private String titulacao; // Titulações separadas por ponto e vírgula (;)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "is_active")
    private boolean isActive;

    @ManyToMany(mappedBy = "students")
    @JsonIgnoreProperties({"students", "teachers", "tasks"})
    private Set<Classroom> classrooms = new java.util.HashSet<>();

    @ManyToMany(mappedBy = "teachers")
    @JsonIgnoreProperties({"students", "teachers", "tasks"})
    private Set<Classroom> classroomsAsTeacher = new java.util.HashSet<>();

    // Construtores
    public User() {}

    public User(Long id, String email, String password, String name, String nomeCompleto, String cpf, String dataNascimento, String nomeMae, String nomePai, String telefone, String endereco, String titulacao, Role role, boolean isActive, Set<Classroom> classrooms, Set<Classroom> classroomsAsTeacher) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.name = name;
        this.nomeCompleto = nomeCompleto;
        this.cpf = cpf;
        this.dataNascimento = dataNascimento;
        this.nomeMae = nomeMae;
        this.nomePai = nomePai;
        this.telefone = telefone;
        this.endereco = endereco;
        this.titulacao = titulacao;
        this.role = role;
        this.isActive = isActive;
        this.classrooms = classrooms;
        this.classroomsAsTeacher = classroomsAsTeacher;
    }

    // Getters e Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getNomeCompleto() {
        return nomeCompleto;
    }

    public void setNomeCompleto(String nomeCompleto) {
        this.nomeCompleto = nomeCompleto;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getDataNascimento() {
        return dataNascimento;
    }

    public void setDataNascimento(String dataNascimento) {
        this.dataNascimento = dataNascimento;
    }

    public String getNomeMae() {
        return nomeMae;
    }

    public void setNomeMae(String nomeMae) {
        this.nomeMae = nomeMae;
    }

    public String getNomePai() {
        return nomePai;
    }

    public void setNomePai(String nomePai) {
        this.nomePai = nomePai;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public String getEndereco() {
        return endereco;
    }

    public void setEndereco(String endereco) {
        this.endereco = endereco;
    }

    public String getTitulacao() {
        return titulacao;
    }

    public void setTitulacao(String titulacao) {
        this.titulacao = titulacao;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public Set<Classroom> getClassrooms() {
        return classrooms;
    }

    public void setClassrooms(Set<Classroom> classrooms) {
        this.classrooms = classrooms;
    }

    public Set<Classroom> getClassroomsAsTeacher() {
        return classroomsAsTeacher;
    }

    public void setClassroomsAsTeacher(Set<Classroom> classroomsAsTeacher) {
        this.classroomsAsTeacher = classroomsAsTeacher;
    }

    // Builder pattern
    public static UserBuilder builder() {
        return new UserBuilder();
    }

    public static class UserBuilder {
        private Long id;
        private String email;
        private String password;
        private String name;
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
        private Set<Classroom> classrooms = new java.util.HashSet<>();
        private Set<Classroom> classroomsAsTeacher = new java.util.HashSet<>();

        public UserBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public UserBuilder email(String email) {
            this.email = email;
            return this;
        }

        public UserBuilder password(String password) {
            this.password = password;
            return this;
        }

        public UserBuilder name(String name) {
            this.name = name;
            return this;
        }

        public UserBuilder nomeCompleto(String nomeCompleto) {
            this.nomeCompleto = nomeCompleto;
            return this;
        }

        public UserBuilder cpf(String cpf) {
            this.cpf = cpf;
            return this;
        }

        public UserBuilder dataNascimento(String dataNascimento) {
            this.dataNascimento = dataNascimento;
            return this;
        }

        public UserBuilder nomeMae(String nomeMae) {
            this.nomeMae = nomeMae;
            return this;
        }

        public UserBuilder nomePai(String nomePai) {
            this.nomePai = nomePai;
            return this;
        }

        public UserBuilder telefone(String telefone) {
            this.telefone = telefone;
            return this;
        }

        public UserBuilder endereco(String endereco) {
            this.endereco = endereco;
            return this;
        }

        public UserBuilder titulacao(String titulacao) {
            this.titulacao = titulacao;
            return this;
        }

        public UserBuilder role(Role role) {
            this.role = role;
            return this;
        }

        public UserBuilder isActive(boolean isActive) {
            this.isActive = isActive;
            return this;
        }

        public UserBuilder classrooms(Set<Classroom> classrooms) {
            this.classrooms = classrooms;
            return this;
        }

        public UserBuilder classroomsAsTeacher(Set<Classroom> classroomsAsTeacher) {
            this.classroomsAsTeacher = classroomsAsTeacher;
            return this;
        }

        public User build() {
            return new User(id, email, password, name, nomeCompleto, cpf, dataNascimento, nomeMae, nomePai, telefone, endereco, titulacao, role, isActive, classrooms, classroomsAsTeacher);
        }
    }

    @Override
    @JsonIgnore
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    @JsonIgnore
    public String getPassword() {
        return password;
    }

    @Override
    @JsonIgnore
    public String getUsername() {
        return email;
    }

    @Override
    @JsonIgnore
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    @JsonIgnore
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    @JsonIgnore
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    @JsonIgnore
    public boolean isEnabled() {
        return isActive;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}