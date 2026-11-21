package com.laaccion.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.laaccion.common.error.BadRequestException;
import com.laaccion.common.error.ServiceUnavailableException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

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
}
