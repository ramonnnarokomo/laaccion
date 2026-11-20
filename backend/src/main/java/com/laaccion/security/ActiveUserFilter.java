package com.laaccion.security;

import com.laaccion.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Revoca la sesión en cuanto el usuario deja de ser válido: si un administrador lo desactiva o le
 * cambia el rol, la sesión abierta deja de servir en la siguiente petición (no al caducar).
 *
 * <p>No es un {@code @Component} a propósito: se registra solo dentro de la cadena de Spring
 * Security. Como bean, Spring Boot lo añadiría además como filtro del contenedor.
 */
public class ActiveUserFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    public ActiveUserFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AppUserPrincipal principal) {
            boolean stillValid = userRepository.findById(principal.getId())
                    .map(user -> user.isEnabled() && user.getRole() == principal.getRole())
                    .orElse(false);
            if (!stillValid) {
                HttpSession session = request.getSession(false);
                if (session != null) {
                    session.invalidate();
                }
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}
