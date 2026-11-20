package com.laaccion.image;

import java.time.Instant;

public record ImageResponse(Long id, String url, String contentType, long sizeBytes, Integer width, Integer height,
                            Instant createdAt) {

    public static ImageResponse from(Image image) {
        return new ImageResponse(image.getId(), image.getUrl(), image.getContentType(), image.getSizeBytes(),
                image.getWidth(), image.getHeight(), image.getCreatedAt());
    }
}
