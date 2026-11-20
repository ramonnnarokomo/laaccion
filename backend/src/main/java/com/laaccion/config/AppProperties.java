package com.laaccion.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Configuración propia de la aplicación (prefijo {@code app}). Se valida al arrancar:
 * si falta algo obligatorio, la aplicación no levanta.
 */
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @NotBlank String publicBaseUrl,
        @NotNull @Valid Cors cors,
        @NotNull @Valid Security security,
        @NotNull @Valid RateLimit rateLimit,
        @NotNull @Valid Captcha captcha,
        @NotNull @Valid Storage storage,
        @NotNull @Valid Images images,
        @NotNull @Valid Board board,
        @NotNull @Valid BootstrapAdmin bootstrapAdmin) {

    public record Cors(@NotEmpty List<String> allowedOrigins) {
    }

    public record Security(
            boolean secureCookies,
            String cookieDomain,
            String clientIpHeader,
            @NotBlank @Size(min = 32) String ipHashSecret,
            @NotBlank String contentSecurityPolicy,
            @Min(1) int maxLoginAttempts,
            @Min(1) int lockMinutes) {
    }

    public record RateLimit(@Min(1) int loginPerMinute, @Min(1) int votePerMinute, @Min(1) int uploadPerMinute) {
    }

    public record Captcha(boolean enabled, String turnstileSecret) {
    }

    public record Storage(@NotBlank String type, @NotNull @Valid Local local, @NotNull @Valid S3 s3) {

        public record Local(@NotBlank String directory, @NotBlank String publicBaseUrl) {
        }

        public record S3(String endpoint, String region, String bucket, String accessKey, String secretKey,
                         String publicBaseUrl) {
        }
    }

    public record Images(@Min(1) long maxSizeBytes, @Min(1) int maxDimension) {
    }

    public record Board(@Min(1) int maxActive, @Min(1) int maxExpired, @NotBlank String zone) {
    }

    public record BootstrapAdmin(String email, String password, String displayName) {
    }
}
