package com.laaccion.article;

import static org.assertj.core.api.Assertions.assertThat;

import com.laaccion.config.AppProperties;
import org.junit.jupiter.api.Test;

class HtmlSanitizerTest {

    // El saneador solo necesita la URL pública; el resto de la configuración no interviene.
    private final HtmlSanitizer sanitizer = new HtmlSanitizer(
            new AppProperties("https://laaccion.test", null, null, null, null, null, null, null, null));

    @Test
    void eliminaScriptsManejadoresDeEventosYEnlacesJavascript() {
        String html = sanitizer.sanitize("<p onclick=\"robar()\">Hola</p><script>alert(1)</script>"
                + "<a href=\"javascript:alert(1)\">pincha</a><img src=\"x\" onerror=\"alert(1)\">"
                + "<style>body{display:none}</style>");

        assertThat(html).contains("<p>Hola</p>").contains("pincha");
        assertThat(html).doesNotContain("script").doesNotContain("onclick").doesNotContain("onerror")
                .doesNotContain("javascript:").doesNotContain("<style");
    }

    @Test
    void conservaElFormatoDeUnArticuloNormal() {
        String html = sanitizer.sanitize("<h2>Título</h2><p>Texto con <strong>negrita</strong> y "
                + "<a href=\"https://example.org/fuente\">un enlace</a>.</p><blockquote>Cita</blockquote>"
                + "<a href=\"/articulo/otro\">interno</a>");

        assertThat(html).contains("<h2>Título</h2>").contains("<strong>negrita</strong>")
                .contains("href=\"https://example.org/fuente\"").contains("rel=\"noopener noreferrer\"")
                .contains("<blockquote>Cita</blockquote>").contains("href=\"/articulo/otro\"");
    }

    @Test
    void soloAdmiteIframesDeLosProveedoresDeVideoPrevistos() {
        String html = sanitizer.sanitize(
                "<iframe src=\"https://www.youtube.com/embed/abc123\" width=\"560\" height=\"315\"></iframe>"
                        + "<iframe src=\"https://malo.example/phishing\"></iframe>"
                        + "<iframe src=\"http://www.youtube.com/embed/sin-https\"></iframe>");

        assertThat(html).contains("https://www.youtube.com/embed/abc123").contains("loading=\"lazy\"");
        assertThat(html).doesNotContain("malo.example").doesNotContain("sin-https");
    }

    @Test
    void soloAdmiteImagenesDelPropioSitio() {
        String html = sanitizer.sanitize("<p><img src=\"/media/2026/11/foto.webp\" alt=\"propia\"></p>"
                + "<p><img src=\"https://www.laaccion.test/media/otra.webp\" alt=\"absoluta\"></p>"
                + "<p><img src=\"https://rastreador.example/pixel.gif\" alt=\"externa\"></p>"
                + "<p><img src=\"//rastreador.example/pixel.gif\" alt=\"sin-esquema\"></p>");

        assertThat(html).contains("/media/2026/11/foto.webp").contains("https://www.laaccion.test/media/otra.webp");
        assertThat(html).doesNotContain("rastreador.example");
    }

    @Test
    void calculaLosMinutosDeLectura() {
        assertThat(sanitizer.readingMinutes("")).isEqualTo(1);
        assertThat(sanitizer.readingMinutes("<p>" + "palabra ".repeat(220) + "</p>")).isEqualTo(1);
        assertThat(sanitizer.readingMinutes("<p>" + "palabra ".repeat(900) + "</p>")).isEqualTo(5);
    }
}
