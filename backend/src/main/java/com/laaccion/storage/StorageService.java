package com.laaccion.storage;

/**
 * Almacenamiento de ficheros. En Railway el disco del contenedor es efímero, así que en
 * producción tiene que ser externo (S3, Cloudflare R2...).
 */
public interface StorageService {

    /** Guarda el fichero y devuelve su URL pública. */
    String store(String key, byte[] data, String contentType);

    void delete(String key);
}
