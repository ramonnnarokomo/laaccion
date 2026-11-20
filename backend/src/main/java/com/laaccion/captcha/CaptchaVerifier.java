package com.laaccion.captcha;

/** Verificación anti-bots para las acciones públicas (votar). */
public interface CaptchaVerifier {

    /** @return {@code true} si el token del captcha es válido para esa IP. */
    boolean verify(String token, String clientIp);
}
