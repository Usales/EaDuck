CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'CHAT',
    classroom_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_chat_messages_classroom_id ON chat_messages(classroom_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_sender_email ON chat_messages(sender_email);

-- Comentários
COMMENT ON TABLE chat_messages IS 'Tabela para armazenar mensagens do chat';
COMMENT ON COLUMN chat_messages.sender_email IS 'Email do remetente da mensagem';
COMMENT ON COLUMN chat_messages.sender_name IS 'Nome do remetente da mensagem';
COMMENT ON COLUMN chat_messages.content IS 'Conteúdo da mensagem';
COMMENT ON COLUMN chat_messages.message_type IS 'Tipo da mensagem: CHAT, JOIN, LEAVE';
COMMENT ON COLUMN chat_messages.classroom_id IS 'ID da sala de aula (NULL para chat geral)';
COMMENT ON COLUMN chat_messages.created_at IS 'Data e hora de criação da mensagem';
COMMENT ON COLUMN chat_messages.updated_at IS 'Data e hora da última atualização';
