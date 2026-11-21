package com.laaccion.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.laaccion.common.error.BadRequestException;
import com.laaccion.common.error.ServiceUnavailableException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.client.RestClientResponseException;

class HttpAiClientTest {

    @Test
    void elCuerpoParaAnthropicNoLlevaParametrosDeMuestreo() {
        Map<String, Object> body = HttpAiClient.anthropicBody("claude-haiku-5-5", "sistema", "hola", 500);
        assertThat(body).containsEntry("model", "claude-haiku-5-5").containsEntry("max_tokens", 500)
                .containsEntry("system", "sistema").doesNotContainKeys("temperature", "top_p", "top_k");
    }

    @Test
    void uneLosBloquesDeTextoDeAnthropic() {
        Map<String, Object> response = Map.of("stop_reason", "end_turn", "content", List.of(
                Map.of("type", "text", "text", "Hola, "), Map.of("type", "text", "text", "mundo")));
        assertThat(HttpAiClient.parseAnthropic(response)).isEqualTo("Hola, mundo");
    }

    @Test
    void unaRespuestaCortadaPorLongitudEsUnError() {
        Map<String, Object> anthropic = Map.of("stop_reason", "max_tokens", "content",
                List.of(Map.of("type", "text", "text", "a medias")));
        assertThatThrownBy(() -> HttpAiClient.parseAnthropic(anthropic)).isInstanceOf(BadRequestException.class);

        Map<String, Object> openAi = Map.of("choices", List.of(Map.of("finish_reason", "length",
                "message", Map.of("content", "a medias"))));
        assertThatThrownBy(() -> HttpAiClient.parseOpenAi(openAi)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void leeLaRespuestaCompatibleConOpenAi() {
        Map<String, Object> response = Map.of("choices", List.of(Map.of("finish_reason", "stop",
                "message", Map.of("role", "assistant", "content", "  Texto mejorado  "))));
        assertThat(HttpAiClient.parseOpenAi(response)).isEqualTo("Texto mejorado");
    }

    @Test
    void unaRespuestaVaciaOMalFormadaNoSeDaPorBuena() {
        assertThatThrownBy(() -> HttpAiClient.parseAnthropic(Map.of("content", List.of())))
                .isInstanceOf(ServiceUnavailableException.class);
        assertThatThrownBy(() -> HttpAiClient.parseOpenAi(Map.of("error", "x")))
                .isInstanceOf(ServiceUnavailableException.class);
    }

    @Test
    void quitaLosBloquesDeCodigo() {
        assertThat(AiAssistService.stripFences("```html\n<p>Hola</p>\n```")).isEqualTo("<p>Hola</p>");
        assertThat(AiAssistService.stripFences("<p>Sin bloque</p>")).isEqualTo("<p>Sin bloque</p>");
    }

    private static AiProperties props(String model, String fallback) {
        return new AiProperties("openai", "clave", model, "https://ejemplo.test", 0, 0, 0, fallback);
    }

    private static HttpAiClient client() {
        HttpAiClient client = new HttpAiClient(props("principal", "reserva"));
        client.retryDelayMillis = 0;
        return client;
    }

    private static RestClientResponseException status(int code) {
        return new RestClientResponseException("error " + code, HttpStatusCode.valueOf(code), "error", null, null, null);
    }

    @Test
    void elModeloDeReservaVaDetrasDelPrincipal() {
        assertThat(props("a", "b").models()).containsExactly("a", "b");
        assertThat(props("a", " ").models()).containsExactly("a");
        assertThat(props("a", null).models()).containsExactly("a");
        assertThat(props("a", "a").models()).containsExactly("a");
    }

    @Test
    void reintentaUnaVezSiElModeloEstaSaturado() {
        List<String> calls = new ArrayList<>();
        String result = client().withRetries(List.of("a", "b"), model -> {
            calls.add(model);
            if (calls.size() == 1) {
                throw status(503);
            }
            return "ok-" + model;
        });
        assertThat(result).isEqualTo("ok-a");
        assertThat(calls).containsExactly("a", "a");
    }

    @Test
    void siElPrincipalSigueSaturadoPasaAlDeReserva() {
        List<String> calls = new ArrayList<>();
        String result = client().withRetries(List.of("a", "b"), model -> {
            calls.add(model);
            if (model.equals("a")) {
                throw status(503);
            }
            return "ok-" + model;
        });
        assertThat(result).isEqualTo("ok-b");
        assertThat(calls).containsExactly("a", "a", "b");
    }

    @Test
    void unaCuotaAgotadaPasaDirectamenteAlDeReserva() {
        List<String> calls = new ArrayList<>();
        String result = client().withRetries(List.of("a", "b"), model -> {
            calls.add(model);
            if (model.equals("a")) {
                throw status(429);
            }
            return "ok-" + model;
        });
        assertThat(result).isEqualTo("ok-b");
        assertThat(calls).containsExactly("a", "b");
    }

    @Test
    void unErrorQueNoEsPasajeroNoSeReintenta() {
        List<String> calls = new ArrayList<>();
        assertThatThrownBy(() -> client().withRetries(List.of("a", "b"), model -> {
            calls.add(model);
            throw status(400);
        })).isInstanceOf(RestClientResponseException.class);
        assertThat(calls).containsExactly("a");
    }

    @Test
    void siTodosFallanSeLanzaElUltimoError() {
        List<String> calls = new ArrayList<>();
        assertThatThrownBy(() -> client().withRetries(List.of("a", "b"), model -> {
            calls.add(model);
            throw status(503);
        })).isInstanceOfSatisfying(RestClientResponseException.class,
                ex -> assertThat(ex.getStatusCode().value()).isEqualTo(503));
        assertThat(calls).containsExactly("a", "a", "b", "b");
    }
}
