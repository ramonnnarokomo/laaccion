package com.laaccion.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SlugGeneratorTest {

    @Test
    void quitaAcentosSignosYMayusculas() {
        assertThat(SlugGenerator.slugify("La educación no termina en el aula"))
                .isEqualTo("la-educacion-no-termina-en-el-aula");
        assertThat(SlugGenerator.slugify("¿Qué pregunta debería debatir nuestro barrio?"))
                .isEqualTo("que-pregunta-deberia-debatir-nuestro-barrio");
        assertThat(SlugGenerator.slugify("  España & Ñandú -- 2026!! ")).isEqualTo("espana-nandu-2026");
    }

    @Test
    void devuelveVacioSiNoQuedaNadaAprovechable() {
        assertThat(SlugGenerator.slugify("¡¡¡???")).isEmpty();
        assertThat(SlugGenerator.slugify(null)).isEmpty();
    }

    @Test
    void acortaLosTitularesLargosSinDejarGuionesSueltos() {
        String slug = SlugGenerator.slugify("palabra ".repeat(40));
        assertThat(slug).hasSizeLessThanOrEqualTo(80).doesNotStartWith("-").doesNotEndWith("-");
    }
}
