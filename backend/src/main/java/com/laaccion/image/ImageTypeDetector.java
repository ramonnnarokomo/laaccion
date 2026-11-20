package com.laaccion.image;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Detecta el tipo real de una imagen por sus primeros bytes ("números mágicos").
 * No se usa ni la extensión ni el Content-Type que envía el cliente: ambos se pueden falsear.
 */
public final class ImageTypeDetector {

    private ImageTypeDetector() {
    }

    public static Optional<ImageType> detect(byte[] data) {
        if (data == null || data.length < 12) {
            return Optional.empty();
        }
        if (startsWith(data, 0, 0xFF, 0xD8, 0xFF)) {
            return Optional.of(ImageType.JPEG);
        }
        if (startsWith(data, 0, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
            return Optional.of(ImageType.PNG);
        }
        if (ascii(data, 0, 6).equals("GIF87a") || ascii(data, 0, 6).equals("GIF89a")) {
            return Optional.of(ImageType.GIF);
        }
        if (ascii(data, 0, 4).equals("RIFF") && ascii(data, 8, 4).equals("WEBP")) {
            return Optional.of(ImageType.WEBP);
        }
        if (ascii(data, 4, 4).equals("ftyp")) {
            String brand = ascii(data, 8, 4);
            if (brand.equals("avif") || brand.equals("avis")) {
                return Optional.of(ImageType.AVIF);
            }
        }
        return Optional.empty();
    }

    private static boolean startsWith(byte[] data, int offset, int... signature) {
        for (int i = 0; i < signature.length; i++) {
            if ((data[offset + i] & 0xFF) != signature[i]) {
                return false;
            }
        }
        return true;
    }

    private static String ascii(byte[] data, int offset, int length) {
        return new String(data, offset, length, StandardCharsets.US_ASCII);
    }
}
