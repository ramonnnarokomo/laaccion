package com.laaccion.captcha;

import com.laaccion.config.AppProperties;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Cloudflare Turnstile. La clave secreta vive solo en el back; en el front va únicamente la
 * site key, que es pública por diseño.
 */
@Component
@ConditionalOnProperty(prefix = "app.captcha", name = "enabled", havingValue = "true", matchIfMissing = true)
public class TurnstileCaptchaVerifier implements CaptchaVerifier {

    private static final Logger log = LoggerFactory.getLogger(TurnstileCaptchaVerifier.class);
    private static final String VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {
            };

    private final String secret;
    private final RestClient restClient;

    public TurnstileCaptchaVerifier(AppProperties properties) {
        this.secret = properties.captcha().turnstileSecret();
        if (!StringUtils.hasText(secret)) {
            throw new IllegalStateException("app.captcha.enabled=true pero falta TURNSTILE_SECRET_KEY.");
        }
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    @Override
    public boolean verify(String token, String clientIp) {
        if (!StringUtils.hasText(token)) {
            return false;
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", secret);
        form.add("response", token);
        if (StringUtils.hasText(clientIp)) {
            form.add("remoteip", clientIp);
        }
        try {
            Map<String, Object> body = restClient.post()
                    .uri(VERIFY_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(MAP_TYPE);
            return body != null && Boolean.TRUE.equals(body.get("success"));
        } catch (RestClientException ex) {
            // Si Turnstile no responde se rechaza el voto: mejor fallar cerrado que dejar pasar bots.
            log.warn("No se pudo verificar el captcha: {}", ex.getMessage());
            return false;
        }
    }
}
