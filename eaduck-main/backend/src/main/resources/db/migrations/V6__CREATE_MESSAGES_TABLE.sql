CREATE TABLE messages (
                          id BIGSERIAL PRIMARY KEY,
                          sender_id BIGINT,
                          receiver_id BIGINT,
                          content TEXT NOT NULL,
                          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE messages
    ADD CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id);
ALTER TABLE messages
    ADD CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id);