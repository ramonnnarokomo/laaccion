package com.laaccion.common;

import com.laaccion.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Obtiene la IP del cliente. Si hay una cabecera de confianza configurada (p. ej. CF-Connecting-IP
 * cuando Cloudflare va delante) se usa esa; si no, la IP de la conexión.
 *
 * <p>Ojo: fiarse de la cabecera solo es seguro si al back no se puede llegar saltándose el proxy
 * que la pone.
 */
@Component
public class ClientIpResolver {

    private static final Pattern IP_PATTERN = Pattern.compile("^[0-9a-fA-F:.]{3,45}$");

    private final String header;

    public ClientIpResolver(AppProperties properties) {
        this.header = properties.security().clientIpHeader();
    }

    public String resolve(HttpServletRequest request) {
        if (StringUtils.hasText(header)) {
            String value = request.getHeader(header);
            if (value != null) {
                String first = value.split(",")[0].trim();
                if (IP_PATTERN.matcher(first).matches()) {
                    return first;
                }
            }
        }
        return request.getRemoteAddr();
    }
}
