package com.eaduck.backend.config.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.SignatureException;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);

    @Value("${jwt.secret}")
    private String secretKey;
    
    // Aumentar para 2 horas
    private static final long EXPIRATION_TIME = 1000 * 60 * 60 * 2; // 2 horas
    // Adicionar margem de tolerância de 5 minutos
    private static final long CLOCK_SKEW = 1000 * 60 * 5; // 5 minutos

    private SecretKey getSigningKey() {
        byte[] keyBytes = Base64.getDecoder().decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String extractUsername(String token) {
        try {
            String username = extractClaim(token, Claims::getSubject);
            logger.info("[JWT Service] Usuário extraído do token: {}", username);
            return username;
        } catch (Exception e) {
            logger.error("[JWT Service] Erro ao extrair usuário do token: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao extrair usuário do token: " + e.getMessage());
        }
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .setAllowedClockSkewSeconds(CLOCK_SKEW / 1000) // Adicionar tolerância
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (MalformedJwtException e) {
            throw new RuntimeException("Token JWT malformado: " + e.getMessage());
        } catch (ExpiredJwtException e) {
            throw new RuntimeException("Token JWT expirado: " + e.getMessage());
        } catch (SignatureException e) {
            throw new RuntimeException("Assinatura do token JWT inválida: " + e.getMessage());
        } catch (Exception e) {
            throw new RuntimeException("Erro ao parsear token JWT: " + e.getMessage());
        }
    }

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("authorities", userDetails.getAuthorities());
        String token = createToken(claims, userDetails.getUsername());
        logger.info("[JWT Service] Token gerado para usuário: {}", userDetails.getUsername());
        return token;
    }

    private String createToken(Map<String, Object> claims, String subject) {
        try {
            return Jwts.builder()
                    .setClaims(claims)
                    .setSubject(subject)
                    .setIssuedAt(new Date(System.currentTimeMillis()))
                    .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                    .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                    .compact();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar token JWT: " + e.getMessage());
        }
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            boolean valid = (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
            logger.info("[JWT Service] Token válido para {}? {}", username, valid);
            return valid;
        } catch (Exception e) {
            logger.error("[JWT Service] Erro ao validar token: {}", e.getMessage(), e);
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        try {
            Date expiration = extractExpiration(token);
            // Adicionar margem de tolerância
            return expiration.before(new Date(System.currentTimeMillis() - CLOCK_SKEW));
        } catch (Exception e) {
            logger.error("[JWT Service] Erro ao verificar expiração do token: {}", e.getMessage());
            return true;
        }
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .setAllowedClockSkewSeconds(CLOCK_SKEW / 1000) // Adicionar tolerância
                    .build()
                    .parseClaimsJws(token);
            logger.info("[JWT Service] Token validado com sucesso");
            return true;
        } catch (Exception e) {
            logger.error("[JWT Service] Erro ao validar token: {}", e.getMessage(), e);
            return false;
        }
    }
}