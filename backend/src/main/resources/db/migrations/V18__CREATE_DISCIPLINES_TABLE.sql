-- Criar tabela de disciplinas
CREATE TABLE disciplines (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir disciplinas iniciais
INSERT INTO disciplines (name, description, is_active) VALUES
('Língua Portuguesa', 'Disciplina de Língua Portuguesa', true),
('Matemática', 'Disciplina de Matemática', true),
('História', 'Disciplina de História', true),
('Geografia', 'Disciplina de Geografia', true),
('Biologia', 'Disciplina de Biologia', true),
('Física', 'Disciplina de Física', true),
('Química', 'Disciplina de Química', true),
('Inglês', 'Disciplina de Inglês', true),
('Arte', 'Disciplina de Arte', true),
('Educação Física', 'Disciplina de Educação Física', true);

