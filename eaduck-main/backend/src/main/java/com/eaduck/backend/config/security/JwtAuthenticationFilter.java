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

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

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
            filterChain.doFilter(request, response);
            return;
        }

        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
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
            }
        }
        logger.info("[JWT Filter] Fim do filtro para {} {}", request.getMethod(), request.getRequestURI());
        filterChain.doFilter(request, response);
    }
}
