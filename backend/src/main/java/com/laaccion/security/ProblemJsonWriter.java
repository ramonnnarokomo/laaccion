package com.laaccion.security;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Escribe errores 401/403 con el mismo formato problem+json que el resto de la API. */
final class ProblemJsonWriter {

    private ProblemJsonWriter() {
    }

    static void write(HttpServletResponse response, int status, String title, String detail) throws IOException {
        response.setStatus(status);
        response.setContentType("application/problem+json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        // Textos fijos definidos en el código: no hay nada que escapar.
        response.getWriter().write("{\"type\":\"about:blank\",\"title\":\"" + title + "\",\"status\":" + status
                + ",\"detail\":\"" + detail + "\"}");
    }
}
