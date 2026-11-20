package com.laaccion.image;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ImageTypeDetectorTest {

    private static byte[] latin1(String text) {
        return text.getBytes(StandardCharsets.ISO_8859_1);
    }

    @Test
    void reconoceLosFormatosAdmitidosPorSusPrimerosBytes() {
        byte[] jpeg = new byte[16];
        jpeg[0] = (byte) 0xFF;
        jpeg[1] = (byte) 0xD8;
        jpeg[2] = (byte) 0xFF;
        byte[] png = new byte[16];
        System.arraycopy(new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}, 0, png, 0, 8);

        assertThat(ImageTypeDetector.detect(jpeg)).contains(ImageType.JPEG);
        assertThat(ImageTypeDetector.detect(png)).contains(ImageType.PNG);
        assertThat(ImageTypeDetector.detect(latin1("GIF89a.........."))).contains(ImageType.GIF);
        assertThat(ImageTypeDetector.detect(latin1("RIFF\0\0\0\0WEBPVP8 "))).contains(ImageType.WEBP);
        assertThat(ImageTypeDetector.detect(latin1("\0\0\0\u001cftypavif\0\0\0\0"))).contains(ImageType.AVIF);
    }

    @Test
    void rechazaLoQueNoEsUnaImagenAunqueSeHagaPasarPorUna() {
        assertThat(ImageTypeDetector.detect(latin1("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>")))
                .isEmpty();
        assertThat(ImageTypeDetector.detect(latin1("<?php echo 'hola'; ?> relleno"))).isEmpty();
        assertThat(ImageTypeDetector.detect(latin1("\0\0\0\u001cftypisom\0\0\0\0"))).isEmpty();
        assertThat(ImageTypeDetector.detect(new byte[3])).isEmpty();
        assertThat(ImageTypeDetector.detect(null)).isEmpty();
    }
}
