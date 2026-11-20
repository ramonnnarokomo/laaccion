package com.laaccion.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;

/** Con sesión pero sin permiso (o token CSRF ausente o incorrecto): 403 en JSON. */
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
            AccessDeniedException accessDeniedException) throws IOException {
        ProblemJsonWriter.write(response, HttpServletResponse.SC_FORBIDDEN, "Acceso denegado",
                "No tienes permiso para realizar esta operación.");
    }
}
