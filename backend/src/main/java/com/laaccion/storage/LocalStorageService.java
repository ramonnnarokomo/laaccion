package com.laaccion.storage;

import com.laaccion.config.AppProperties;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/** Guarda en una carpeta del disco. Solo para desarrollo local (app.storage.type=local). */
@Service
@ConditionalOnProperty(prefix = "app.storage", name = "type", havingValue = "local")
public class LocalStorageService implements StorageService {

    private final Path root;
    private final String publicBaseUrl;

    public LocalStorageService(AppProperties properties) {
        AppProperties.Storage.Local local = properties.storage().local();
        this.root = Path.of(local.directory()).toAbsolutePath().normalize();
        this.publicBaseUrl = local.publicBaseUrl().replaceAll("/+$", "");
    }

    @Override
    public String store(String key, byte[] data, String contentType) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, data);
        } catch (IOException ex) {
            throw new UncheckedIOException("No se pudo guardar el fichero", ex);
        }
        return publicBaseUrl + "/" + key;
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException ex) {
            throw new UncheckedIOException("No se pudo borrar el fichero", ex);
        }
    }

    private Path resolve(String key) {
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Ruta de fichero no válida");
        }
        return target;
    }
}
