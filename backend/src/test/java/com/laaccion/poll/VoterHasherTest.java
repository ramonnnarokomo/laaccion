package com.laaccion.poll;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class VoterHasherTest {

    private final VoterHasher hasher = new VoterHasher("secreto-de-prueba-secreto-de-prueba-0123");

    @Test
    void esDeterministaYNoDejaVerLaIp() {
        String hash = hasher.hash(1L, "203.0.113.7");

        assertThat(hash).matches("[0-9a-f]{64}").doesNotContain("203.0.113.7");
        assertThat(hasher.hash(1L, "203.0.113.7")).isEqualTo(hash);
    }

    @Test
    void cambiaConLaEncuestaLaIpYElSecreto() {
        String hash = hasher.hash(1L, "203.0.113.7");

        assertThat(hasher.hash(2L, "203.0.113.7")).isNotEqualTo(hash);
        assertThat(hasher.hash(1L, "203.0.113.8")).isNotEqualTo(hash);
        assertThat(new VoterHasher("otro-secreto-otro-secreto-otro-secreto-00").hash(1L, "203.0.113.7"))
                .isNotEqualTo(hash);
    }
}
