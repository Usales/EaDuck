-- Adicionar coluna is_active na tabela classrooms
ALTER TABLE classrooms ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Atualizar todas as salas existentes para ativas
UPDATE classrooms SET is_active = TRUE WHERE is_active IS NULL;
