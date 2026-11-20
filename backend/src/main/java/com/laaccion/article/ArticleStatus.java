package com.laaccion.article;

/**
 * Estado de un artículo de cara a la API.
 *
 * <p>En base de datos solo se guardan DRAFT y PUBLISHED. "Programado" no es un estado guardado:
 * es un artículo PUBLISHED cuya fecha de publicación todavía no ha llegado. Así no hace falta
 * ningún proceso que "publique" a su hora: el artículo se hace visible solo.
 */
public enum ArticleStatus {
    DRAFT,
    SCHEDULED,
    PUBLISHED
}
