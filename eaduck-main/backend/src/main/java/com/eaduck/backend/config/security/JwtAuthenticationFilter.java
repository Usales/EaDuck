package com.eaduck.backend.config.security;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        try {
        logger.info("[JWT Filter] Iniciando filtro para {} {}", request.getMethod(), request.getRequestURI());
        final String authHeader = request.getHeader("Authorization");
        logger.info("[JWT Filter] Authorization header: {}", authHeader);
        final String jwt;
        final String userEmail;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            logger.warn("[JWT Filter] Authorization header ausente ou inválido");
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        try {
            userEmail = jwtService.extractUsername(jwt);
            logger.info("[JWT Filter] Usuário extraído do token: {}", userEmail);
        } catch (Exception e) {
            logger.error("[JWT Filter] Erro ao extrair usuário do token: {}", e.getMessage(), e);
                sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Token inválido ou expirado");
            return;
        }

        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
            boolean valid = jwtService.isTokenValid(jwt, userDetails);
            logger.info("[JWT Filter] Token válido? {}", valid);
            if (valid) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
                logger.info("[JWT Filter] Autenticação definida no contexto para {}", userEmail);
            } else {
                logger.warn("[JWT Filter] Token inválido para usuário {}", userEmail);
                        sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Token inválido");
                        return;
            }
                } catch (Exception e) {
                    logger.error("[JWT Filter] Erro ao carregar usuário: {}", e.getMessage(), e);
                    sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Usuário não encontrado");
                    return;
                }
            }
        logger.info("[JWT Filter] Fim do filtro para {} {}", request.getMethod(), request.getRequestURI());
        filterChain.doFilter(request, response);
        } catch (Exception e) {
            logger.error("[JWT Filter] Erro durante o processamento do filtro: {}", e.getMessage(), e);
            if (!response.isCommitted()) {
                sendErrorResponse(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Erro interno do servidor");
            }
        }
    }

    private void sendErrorResponse(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        response.getWriter().write(objectMapper.writeValueAsString(error));
    }
}
