-- V7__CREATE_MESSAGES_TABLE.sql
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT REFERENCES users(id),
    receiver_id BIGINT REFERENCES users(id),
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

