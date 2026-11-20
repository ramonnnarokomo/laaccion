package com.laaccion.announcement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.laaccion.common.error.BadRequestException;
import org.junit.jupiter.api.Test;

class AnnouncementUrlTest {

    @Test
    void aceptaEnlacesHttpYCompletaElEsquemaSiFalta() {
        assertThat(AnnouncementService.normalizeUrl("https://ejemplo.com/inscripcion"))
                .isEqualTo("https://ejemplo.com/inscripcion");
        assertThat(AnnouncementService.normalizeUrl("ejemplo.com/inscripcion"))
                .isEqualTo("https://ejemplo.com/inscripcion");
        assertThat(AnnouncementService.normalizeUrl("  ")).isNull();
        assertThat(AnnouncementService.normalizeUrl(null)).isNull();
    }

    @Test
    void rechazaLoQueNoEsUnaDireccionWeb() {
        assertThatThrownBy(() -> AnnouncementService.normalizeUrl("https://"))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> AnnouncementService.normalizeUrl("esto no es una url"))
                .isInstanceOf(BadRequestException.class);
    }
}
