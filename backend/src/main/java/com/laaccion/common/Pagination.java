package com.laaccion.common;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Construye la paginación acotando lo que llega del cliente (el orden lo decide siempre el servidor). */
public final class Pagination {

    public static final int MAX_SIZE = 50;

    private Pagination() {
    }

    public static Pageable of(int page, int size, Sort sort) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_SIZE);
        return PageRequest.of(safePage, safeSize, sort);
    }
}
