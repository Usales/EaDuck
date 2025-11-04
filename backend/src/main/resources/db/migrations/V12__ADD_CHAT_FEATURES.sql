-- Adicionar campos de arquivo e resposta na tabela chat_messages
ALTER TABLE chat_messages 
ADD COLUMN file_url VARCHAR(500),
ADD COLUMN file_type VARCHAR(100),
ADD COLUMN file_name VARCHAR(255),
ADD COLUMN file_size BIGINT,
ADD COLUMN replied_to_message_id BIGINT;

-- Adicionar foreign key para replied_to_message_id
ALTER TABLE chat_messages 
ADD CONSTRAINT fk_chat_messages_replied_to 
FOREIGN KEY (replied_to_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;

-- Criar tabela message_reactions para armazenar reações
CREATE TABLE message_reactions (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_message_reactions_message 
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT uq_message_reactions_user_message_emoji 
        UNIQUE (message_id, user_email, emoji)
);

-- Criar tabela message_views para rastrear visualizações
CREATE TABLE message_views (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_message_views_message 
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT uq_message_views_user_message 
        UNIQUE (message_id, user_email)
);

-- Índices para melhor performance
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_email ON message_reactions(user_email);
CREATE INDEX idx_message_views_message_id ON message_views(message_id);
CREATE INDEX idx_message_views_user_email ON message_views(user_email);
CREATE INDEX idx_chat_messages_replied_to ON chat_messages(replied_to_message_id);

-- Comentários
COMMENT ON COLUMN chat_messages.file_url IS 'URL do arquivo anexado (imagem ou áudio)';
COMMENT ON COLUMN chat_messages.file_type IS 'Tipo MIME do arquivo (image/jpeg, audio/mpeg, etc)';
COMMENT ON COLUMN chat_messages.file_name IS 'Nome original do arquivo';
COMMENT ON COLUMN chat_messages.file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN chat_messages.replied_to_message_id IS 'ID da mensagem respondida (NULL se não for resposta)';
COMMENT ON TABLE message_reactions IS 'Tabela para armazenar reações (emojis) nas mensagens';
COMMENT ON TABLE message_views IS 'Tabela para rastrear visualizações de mensagens';
