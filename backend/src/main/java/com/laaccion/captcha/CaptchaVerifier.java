package com.laaccion.captcha;

/** Verificación anti-bots para votar en las encuestas e iniciar sesión en el panel. */
public interface CaptchaVerifier {

    /** @return {@code true} si el token del captcha es válido para esa IP. */
    boolean verify(String token, String clientIp);
}
