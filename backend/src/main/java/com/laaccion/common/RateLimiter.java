package com.laaccion.common;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

/**
 * Límite de peticiones por clave (ventana fija) en memoria.
 *
 * <p>Vale mientras haya una sola instancia del back. Es la segunda línea de defensa: la primera
 * debería ser el rate limiting de Cloudflare. Si algún día hay varias instancias, hay que moverlo
 * a un almacén compartido (Redis, Bucket4j con JDBC...).
 */
@Component
public class RateLimiter {

    private static final int CLEANUP_THRESHOLD = 10_000;

    private record Window(long expiresAtMillis, AtomicInteger count) {
    }

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final Clock clock;

    public RateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Devuelve {@code true} si la petición cabe en el límite; {@code false} si hay que rechazarla. */
    public boolean tryAcquire(String key, int limit, Duration window) {
        long now = clock.millis();
        if (windows.size() > CLEANUP_THRESHOLD) {
            windows.values().removeIf(w -> w.expiresAtMillis() <= now);
        }
        Window current = windows.compute(key, (k, existing) ->
                existing == null || existing.expiresAtMillis() <= now
                        ? new Window(now + window.toMillis(), new AtomicInteger())
                        : existing);
        return current.count().incrementAndGet() <= limit;
    }
}
