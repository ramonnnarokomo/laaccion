package com.laaccion.article;

import com.laaccion.category.CategoryDtos;
import com.laaccion.tag.TagResponse;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

/** DTOs de artículos. Las entidades JPA nunca salen de la capa de servicio. */
public final class ArticleDtos {

    private ArticleDtos() {
    }

    public record CategoryRef(String name, String slug) {
    }

    /** Tarjeta de artículo para portada y listados públicos. */
    public record ArticleSummaryResponse(String slug, String title, String dek, String summary,
                                         CategoryRef category, String author, String imageUrl, String imageAlt,
                                         Integer imageWidth, Integer imageHeight, int readingMinutes,
                                         Instant publishedAt, boolean featured) {
    }

    /** Artículo completo para la página pública (incluye lo necesario para OG y JSON-LD). */
    public record ArticleDetailResponse(String slug, String title, String dek, String summary, String contentHtml,
                                        CategoryRef category, List<TagResponse> tags, String author,
                                        String imageUrl, String imageAlt, Integer imageWidth, Integer imageHeight,
                                        int readingMinutes, Instant publishedAt, Instant updatedAt,
                                        boolean featured) {
    }

    /** Fila del listado del panel editorial. */
    public record ArticleAdminSummaryResponse(Long id, String slug, String title, ArticleStatus status,
                                              Instant publishedAt, String categoryName, Long authorId,
                                              String authorName, boolean featured, Instant updatedAt) {
    }

    /** Artículo completo para editarlo en el panel. */
    public record ArticleAdminResponse(Long id, String slug, String title, String dek, String summary,
                                       String contentHtml, ArticleStatus status, Instant publishedAt,
                                       Long categoryId, String categoryName, List<String> tags,
                                       Long featuredImageId, String featuredImageUrl, String featuredImageAlt,
                                       String byline, boolean featured, Long authorId, String authorName,
                                       int readingMinutes, Instant createdAt, Instant updatedAt) {
    }

    public record ArticleRequest(
            @NotBlank @Size(max = 200) String title,
            // Opcional: si no llega, se genera a partir del titular.
            @Size(max = 160) @Pattern(regexp = CategoryDtos.SLUG_PATTERN) String slug,
            @Size(max = 300) String dek,
            @NotBlank @Size(max = 600) String summary,
            @NotBlank @Size(max = 300_000) String contentHtml,
            // DRAFT, PUBLISHED (ahora o con fecha pasada) o SCHEDULED (exige publishedAt futuro).
            @NotNull ArticleStatus status,
            Instant publishedAt,
            @NotNull Long categoryId,
            @Size(max = 10) List<@NotBlank @Size(max = 40) String> tags,
            Long featuredImageId,
            @Size(max = 250) String featuredImageAlt,
            @Size(max = 120) String byline,
            Boolean featured) {
    }
}
