package com.laaccion.common;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

/** Formato único de respuesta paginada de la API. */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
        List<T> content = new ArrayList<>(page.getNumberOfElements());
        for (E element : page.getContent()) {
            content.add(mapper.apply(element));
        }
        return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(),
                page.getTotalPages());
    }
}
