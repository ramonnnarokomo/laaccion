package com.laaccion.ai;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

/**
 * Configuración del asistente de redacción (prefijo {@code app.ai}).
 *
 * @param provider          {@code anthropic} o {@code openai} (API compatible con OpenAI)
 * @param apiKey            clave del proveedor; vacía = asistente desactivado
 * @param model             modelo, p. ej. {@code claude-haiku-5-5}
 * @param baseUrl           URL base para {@code openai}; para Anthropic se usa la oficial si está vacía
 * @param maxInputChars     longitud máxima del texto que se envía
 * @param perUserPerMinute  peticiones por editor y minuto
 * @param perUserPerDay     peticiones por editor y día (controla el gasto)
 * @param fallbackModel     modelo de reserva si el principal está saturado o sin cuota; vacío = ninguno
 */
@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(
        String provider,
        String apiKey,
        String model,
        String baseUrl,
        int maxInputChars,
        int perUserPerMinute,
        int perUserPerDay,
        String fallbackModel) {

    public AiProperties {
        provider = StringUtils.hasText(provider) ? provider.trim().toLowerCase() : "anthropic";
        model = StringUtils.hasText(model) ? model.trim() : "claude-haiku-5-5";
        maxInputChars = maxInputChars > 0 ? maxInputChars : 60_000;
        perUserPerMinute = perUserPerMinute > 0 ? perUserPerMinute : 6;
        perUserPerDay = perUserPerDay > 0 ? perUserPerDay : 60;
        fallbackModel = StringUtils.hasText(fallbackModel) ? fallbackModel.trim() : null;
    }

    /** Modelos a probar en orden: el principal y, si lo hay y es otro, el de reserva. */
    public List<String> models() {
        return fallbackModel == null || fallbackModel.equals(model) ? List.of(model) : List.of(model, fallbackModel);
    }

    public boolean enabled() {
        return StringUtils.hasText(apiKey);
    }

    public boolean isOpenAiCompatible() {
        return "openai".equals(provider);
    }
}
