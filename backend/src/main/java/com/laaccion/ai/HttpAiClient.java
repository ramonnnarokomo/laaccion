package com.laaccion.ai;

import com.laaccion.common.error.BadRequestException;
import com.laaccion.common.error.ServiceUnavailableException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Cliente HTTP del asistente. Habla dos formatos:
 * <ul>
 *   <li>{@code anthropic}: API de mensajes de Claude ({@code POST /v1/messages}).</li>
 *   <li>{@code openai}: cualquier API compatible con OpenAI ({@code POST {base}/chat/completions}),
 *       por ejemplo Gemini, Groq o Mistral.</li>
 * </ul>
 * Nunca se escribe la clave en los logs.
 */
@Component
public class HttpAiClient implements AiClient {

    static final String ANTHROPIC_URL = "https://api.anthropic.com";
    static final String ANTHROPIC_VERSION = "2026-10-21";

    private static final Logger log = LoggerFactory.getLogger(HttpAiClient.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE = new ParameterizedTypeReference<>() {
    };

    private final AiProperties properties;
    private final RestClient restClient;

    public HttpAiClient(AiProperties properties) {
        this.properties = properties;
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        // Reescribir un artículo largo puede llevar un rato.
        requestFactory.setReadTimeout(Duration.ofSeconds(120));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    @Override
    public String complete(String system, String user, int maxTokens) {
        if (!properties.enabled()) {
            throw new ServiceUnavailableException("El asistente de redacción no está configurado.");
        }
        try {
            return properties.isOpenAiCompatible() ? callOpenAi(system, user) : callAnthropic(system, user, maxTokens);
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            log.warn("El proveedor de IA respondió {}: {}", status, abbreviate(ex.getResponseBodyAsString()));
            if (status == 401 || status == 403) {
                throw new ServiceUnavailableException("La clave del asistente no es válida. Revisa APP_AI_API_KEY en Railway.");
            }
            if (status == 429) {
                throw new ServiceUnavailableException("El proveedor de IA está saturado o se ha agotado el saldo. Prueba más tarde.");
            }
            throw new ServiceUnavailableException("El asistente no está disponible ahora mismo. Prueba más tarde.");
        } catch (RestClientException ex) {
            log.warn("No se pudo contactar con el proveedor de IA: {}", ex.getMessage());
            throw new ServiceUnavailableException("El asistente no está disponible ahora mismo. Prueba más tarde.");
        }
    }

    private String callAnthropic(String system, String user, int maxTokens) {
        String base = StringUtils.hasText(properties.baseUrl()) ? trimSlash(properties.baseUrl()) : ANTHROPIC_URL;
        Map<String, Object> response = restClient.post()
                .uri(base + "/v1/messages")
                .header("x-api-key", properties.apiKey())
                .header("anthropic-version", ANTHROPIC_VERSION)
                .contentType(MediaType.APPLICATION_JSON)
                .body(anthropicBody(properties.model(), system, user, maxTokens))
                .retrieve()
                .body(MAP_TYPE);
        return parseAnthropic(response);
    }

    private String callOpenAi(String system, String user) {
        if (!StringUtils.hasText(properties.baseUrl())) {
            throw new ServiceUnavailableException("Falta APP_AI_BASE_URL para el proveedor compatible con OpenAI.");
        }
        Map<String, Object> response = restClient.post()
                .uri(trimSlash(properties.baseUrl()) + "/chat/completions")
                .header("Authorization", "Bearer " + properties.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(openAiBody(properties.model(), system, user))
                .retrieve()
                .body(MAP_TYPE);
        return parseOpenAi(response);
    }

    /** Sin temperature/top_p: la versión 2026-10-21 de la API los rechaza. */
    static Map<String, Object> anthropicBody(String model, String system, String user, int maxTokens) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("max_tokens", maxTokens);
        body.put("system", system);
        body.put("messages", List.of(Map.of("role", "user", "content", user)));
        return body;
    }

    static Map<String, Object> openAiBody(String model, String system, String user) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", List.of(
                Map.of("role", "system", "content", system),
                Map.of("role", "user", "content", user)));
        return body;
    }

    static String parseAnthropic(Map<String, Object> response) {
        if (response == null || !(response.get("content") instanceof List<?> blocks)) {
            throw new ServiceUnavailableException("Respuesta inesperada del asistente.");
        }
        if ("max_tokens".equals(response.get("stop_reason"))) {
            throw new BadRequestException("El texto es demasiado largo para el asistente. Prueba con un fragmento.");
        }
        StringBuilder text = new StringBuilder();
        for (Object block : blocks) {
            if (block instanceof Map<?, ?> b && "text".equals(b.get("type")) && b.get("text") instanceof String t) {
                text.append(t);
            }
        }
        return requireText(text.toString());
    }

    static String parseOpenAi(Map<String, Object> response) {
        if (response == null || !(response.get("choices") instanceof List<?> choices) || choices.isEmpty()
                || !(choices.get(0) instanceof Map<?, ?> choice)) {
            throw new ServiceUnavailableException("Respuesta inesperada del asistente.");
        }
        if ("length".equals(choice.get("finish_reason"))) {
            throw new BadRequestException("El texto es demasiado largo para el asistente. Prueba con un fragmento.");
        }
        Object content = choice.get("message") instanceof Map<?, ?> message ? message.get("content") : null;
        return requireText(content instanceof String s ? s : "");
    }

    private static String requireText(String text) {
        if (!StringUtils.hasText(text)) {
            throw new ServiceUnavailableException("El asistente no ha devuelto ningún texto. Prueba otra vez.");
        }
        return text.strip();
    }

    private static String trimSlash(String url) {
        String u = url.trim();
        return u.endsWith("/") ? u.substring(0, u.length() - 1) : u;
    }

    private static String abbreviate(String s) {
        if (s == null) {
            return "";
        }
        return s.length() > 300 ? s.substring(0, 300) + "…" : s;
    }
}
