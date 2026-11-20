package com.laaccion.article;

import com.laaccion.config.AppProperties;
import java.net.URI;
import java.util.Locale;
import java.util.Set;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

/**
 * Sanea en el servidor el HTML que llega del editor del panel antes de guardarlo.
 *
 * <p>Lista blanca: solo sobreviven etiquetas y atributos de maquetación de texto, imágenes y
 * enlaces http(s). Se eliminan scripts, manejadores de eventos (onclick...), estilos en línea,
 * URLs {@code javascript:} y cualquier iframe que no sea un embed de vídeo de un proveedor conocido.
 */
@Component
public class HtmlSanitizer {

    private static final int WORDS_PER_MINUTE = 220;

    private static final Set<String> EMBED_HOSTS = Set.of(
            "www.youtube.com",
            "www.youtube-nocookie.com",
            "player.vimeo.com",
            "www.tiktok.com",
            "www.instagram.com");

    private final Safelist safelist;
    private final String baseUri;

    public HtmlSanitizer(AppProperties properties) {
        this.baseUri = properties.publicBaseUrl();
        this.safelist = Safelist.relaxed()
                .addTags("figure", "figcaption", "hr", "s", "iframe")
                .addAttributes("a", "target")
                .addAttributes("img", "loading")
                .addAttributes("iframe", "src", "width", "height", "title", "allowfullscreen")
                .addProtocols("iframe", "src", "https")
                .addEnforcedAttribute("a", "rel", "noopener noreferrer")
                .preserveRelativeLinks(true);
    }

    public String sanitize(String html) {
        if (html == null) {
            return "";
        }
        Document.OutputSettings output = new Document.OutputSettings().prettyPrint(false);
        String cleaned = Jsoup.clean(html, baseUri, safelist, output);

        Document document = Jsoup.parseBodyFragment(cleaned, baseUri);
        document.outputSettings().prettyPrint(false);
        for (Element iframe : document.select("iframe")) {
            if (isAllowedEmbed(iframe.attr("src"))) {
                iframe.attr("loading", "lazy");
                iframe.attr("referrerpolicy", "strict-origin-when-cross-origin");
            } else {
                iframe.remove();
            }
        }
        // Solo imágenes propias: una imagen enlazada desde otra web le pasaría a ese tercero la IP
        // de cada lector, y la política de privacidad promete que no usamos servicios de terceros.
        for (Element img : document.select("img")) {
            if (!isOwnImage(img.attr("src"))) {
                img.remove();
            }
        }
        return document.body().html();
    }

    /** Minutos de lectura estimados a partir del texto sin etiquetas. */
    public int readingMinutes(String html) {
        String text = Jsoup.parse(html == null ? "" : html).text().trim();
        if (text.isEmpty()) {
            return 1;
        }
        int words = text.split("\\s+").length;
        return Math.max(1, (int) Math.ceil(words / (double) WORDS_PER_MINUTE));
    }

    /** Ruta relativa del propio sitio (/media/...) o URL absoluta del dominio público, con o sin www. */
    private boolean isOwnImage(String src) {
        String value = src == null ? "" : src.trim();
        if (value.startsWith("/") && !value.startsWith("//")) {
            return true;
        }
        String host = hostOf(value);
        String own = hostOf(baseUri);
        return host != null && own != null && bareHost(host).equals(bareHost(own));
    }

    private static String hostOf(String url) {
        try {
            URI uri = URI.create(url == null ? "" : url.trim());
            String scheme = uri.getScheme();
            if (uri.getHost() == null || scheme == null
                    || !(scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http"))) {
                return null;
            }
            return uri.getHost().toLowerCase(Locale.ROOT);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static String bareHost(String host) {
        return host.startsWith("www.") ? host.substring(4) : host;
    }

    private static boolean isAllowedEmbed(String src) {
        try {
            URI uri = URI.create(src.trim());
            return "https".equalsIgnoreCase(uri.getScheme())
                    && uri.getHost() != null
                    && EMBED_HOSTS.contains(uri.getHost().toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
