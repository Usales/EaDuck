package com.eaduck.backend.controller;

public class AuthResponse {
    private String token;
    private Long userId;

    public AuthResponse(String token, Long userId) {
        this.token = token;
        this.userId = userId;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
}