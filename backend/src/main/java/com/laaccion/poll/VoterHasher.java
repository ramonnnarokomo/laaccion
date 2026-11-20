package com.laaccion.poll;

import com.laaccion.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Calcula el identificador con el que se detecta el voto duplicado: HMAC-SHA256(secreto, encuesta + IP).
 *
 * <p>La IP nunca se guarda en claro, y el hash es distinto en cada encuesta, así que no sirve para
 * seguir a una persona de una encuesta a otra.
 */
@Component
public class VoterHasher {

    private static final String ALGORITHM = "HmacSHA256";

    private final byte[] secret;

    @Autowired
    public VoterHasher(AppProperties properties) {
        this(properties.security().ipHashSecret());
    }

    VoterHasher(String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String hash(Long pollId, String clientIp) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(secret, ALGORITHM));
            byte[] digest = mac.doFinal((pollId + "|" + clientIp).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException | InvalidKeyException ex) {
            throw new IllegalStateException("No se pudo calcular el hash del votante", ex);
        }
    }
}
