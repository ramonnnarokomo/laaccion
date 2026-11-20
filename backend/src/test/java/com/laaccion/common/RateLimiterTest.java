package com.laaccion.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class RateLimiterTest {

    private static final Duration MINUTE = Duration.ofMinutes(1);

    /** Reloj que se adelanta a mano. */
    private static final class TestClock extends Clock {

        private long millis = 1_000_000L;

        void advance(Duration duration) {
            millis += duration.toMillis();
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(millis);
        }
    }

    @Test
    void rechazaAlSuperarElLimiteYSeRecuperaAlCambiarDeVentana() {
        TestClock clock = new TestClock();
        RateLimiter limiter = new RateLimiter(clock);

        for (int i = 0; i < 5; i++) {
            assertThat(limiter.tryAcquire("login:1.2.3.4", 5, MINUTE)).isTrue();
        }
        assertThat(limiter.tryAcquire("login:1.2.3.4", 5, MINUTE)).isFalse();

        clock.advance(Duration.ofSeconds(59));
        assertThat(limiter.tryAcquire("login:1.2.3.4", 5, MINUTE)).isFalse();

        clock.advance(Duration.ofSeconds(2));
        assertThat(limiter.tryAcquire("login:1.2.3.4", 5, MINUTE)).isTrue();
    }

    @Test
    void cadaClaveTieneSuPropioContador() {
        RateLimiter limiter = new RateLimiter(new TestClock());

        assertThat(limiter.tryAcquire("a", 1, MINUTE)).isTrue();
        assertThat(limiter.tryAcquire("a", 1, MINUTE)).isFalse();
        assertThat(limiter.tryAcquire("b", 1, MINUTE)).isTrue();
    }
}
