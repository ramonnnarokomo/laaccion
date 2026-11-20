package com.laaccion.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

/** Sin sesión válida: 401 en JSON (nada de redirecciones a un formulario de login). */
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException authException) throws IOException {
        ProblemJsonWriter.write(response, HttpServletResponse.SC_UNAUTHORIZED, "No autenticado",
                "Necesitas iniciar sesión para acceder a este recurso.");
    }
}
