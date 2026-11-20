package com.laaccion.captcha;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Captcha apagado (app.captcha.enabled=false). Solo para desarrollo y tests. */
@Component
@ConditionalOnProperty(prefix = "app.captcha", name = "enabled", havingValue = "false")
public class DisabledCaptchaVerifier implements CaptchaVerifier {

    private static final Logger log = LoggerFactory.getLogger(DisabledCaptchaVerifier.class);

    public DisabledCaptchaVerifier() {
        log.warn("CAPTCHA DESACTIVADO: las votaciones no están protegidas contra bots. No usar en producción.");
    }

    @Override
    public boolean verify(String token, String clientIp) {
        return true;
    }
}
