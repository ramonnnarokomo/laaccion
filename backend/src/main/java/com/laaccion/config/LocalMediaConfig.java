package com.laaccion.config;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Con almacenamiento local (desarrollo), el propio back sirve las imágenes subidas en /media/**. */
@Configuration
@ConditionalOnProperty(prefix = "app.storage", name = "type", havingValue = "local")
public class LocalMediaConfig implements WebMvcConfigurer {

    private final Path directory;

    public LocalMediaConfig(AppProperties properties) {
        this.directory = Path.of(properties.storage().local().directory()).toAbsolutePath().normalize();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        try {
            Files.createDirectories(directory);
        } catch (IOException ex) {
            throw new UncheckedIOException("No se pudo crear la carpeta de subidas", ex);
        }
        String location = directory.toUri().toString();
        registry.addResourceHandler("/media/**")
                .addResourceLocations(location.endsWith("/") ? location : location + "/");
    }
}
