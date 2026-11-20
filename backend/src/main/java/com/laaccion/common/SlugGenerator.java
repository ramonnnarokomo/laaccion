package com.laaccion.common;

import java.text.Normalizer;
import java.util.Locale;

/** Convierte un texto en un slug apto para URL: "¿Qué pregunta?" -> "que-pregunta". */
public final class SlugGenerator {

    private static final int MAX_LENGTH = 80;

    private SlugGenerator() {
    }

    public static String slugify(String text) {
        if (text == null) {
            return "";
        }
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        if (normalized.length() <= MAX_LENGTH) {
            return normalized;
        }
        String cut = normalized.substring(0, MAX_LENGTH);
        int lastDash = cut.lastIndexOf('-');
        if (lastDash > MAX_LENGTH / 2) {
            cut = cut.substring(0, lastDash);
        }
        return cut.replaceAll("-+$", "");
    }
}
