package com.laaccion.category;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class CategoryDtos {

    public static final String SLUG_PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*$";

    private CategoryDtos() {
    }

    public record CategoryResponse(Long id, String name, String slug, String description, int sortOrder) {

        public static CategoryResponse from(Category category) {
            return new CategoryResponse(category.getId(), category.getName(), category.getSlug(),
                    category.getDescription(), category.getSortOrder());
        }
    }

    public record CategoryRequest(
            @NotBlank @Size(max = 80) String name,
            // Opcional: si no llega, se genera a partir del nombre.
            @Size(max = 100) @Pattern(regexp = SLUG_PATTERN) String slug,
            @Size(max = 300) String description,
            @Min(0) @Max(10_000) Integer sortOrder) {
    }
}
