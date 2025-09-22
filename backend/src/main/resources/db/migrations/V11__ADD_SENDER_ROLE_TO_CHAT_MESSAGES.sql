-- Adicionar coluna sender_role na tabela chat_messages
ALTER TABLE chat_messages ADD COLUMN sender_role VARCHAR(20) NOT NULL DEFAULT 'STUDENT';

-- Comentário
COMMENT ON COLUMN chat_messages.sender_role IS 'Role do remetente da mensagem: STUDENT, TEACHER, ADMIN';
