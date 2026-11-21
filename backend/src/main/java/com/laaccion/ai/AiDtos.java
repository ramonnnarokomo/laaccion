package com.laaccion.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class AiDtos {

    private AiDtos() {
    }

    /** Qué parte del artículo se envía. */
    public enum Field { BODY, SUMMARY }

    /** REVIEW: lista de sugerencias. REWRITE: versión mejorada para aplicar o descartar. */
    public enum Mode { REVIEW, REWRITE }

    /**
     * @param text    texto que revisar (HTML si es el cuerpo)
     * @param title   titular, como contexto (opcional)
     * @param context cuerpo del artículo como contexto al trabajar el resumen (opcional)
     */
    public record AssistRequest(
            @NotNull Field field,
            @NotNull Mode mode,
            @NotBlank @Size(max = 200_000) String text,
            @Size(max = 300) String title,
            @Size(max = 200_000) String context) {
    }

    /** @param format "html" (cuerpo reescrito, ya limpiado) o "text" */
    public record AssistResponse(String result, String format) {
    }

    public record StatusResponse(boolean enabled) {
    }
}
