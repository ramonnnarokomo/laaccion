package com.laaccion.article;

import com.laaccion.article.ArticleDtos.ArticleAdminResponse;
import com.laaccion.article.ArticleDtos.ArticleAdminSummaryResponse;
import com.laaccion.article.ArticleDtos.ArticleDetailResponse;
import com.laaccion.article.ArticleDtos.ArticleSummaryResponse;
import com.laaccion.article.ArticleDtos.CategoryRef;
import com.laaccion.image.Image;
import com.laaccion.tag.Tag;
import com.laaccion.tag.TagResponse;
import java.time.Instant;
import org.springframework.util.StringUtils;

/** Conversión entidad -> DTO. Debe llamarse dentro de la transacción (hay asociaciones perezosas). */
final class ArticleMapper {

    private ArticleMapper() {
    }

    static ArticleSummaryResponse toSummary(Article a) {
        Image image = a.getFeaturedImage();
        return new ArticleSummaryResponse(a.getSlug(), a.getTitle(), a.getDek(), a.getSummary(), categoryRef(a),
                authorLine(a), image == null ? null : image.getUrl(), a.getFeaturedImageAlt(),
                image == null ? null : image.getWidth(), image == null ? null : image.getHeight(),
                a.getReadingMinutes(), a.getPublishedAt(), a.isFeatured());
    }

    static ArticleDetailResponse toDetail(Article a) {
        Image image = a.getFeaturedImage();
        return new ArticleDetailResponse(a.getSlug(), a.getTitle(), a.getDek(), a.getSummary(), a.getContentHtml(),
                categoryRef(a), a.getTags().stream().map(TagResponse::from).toList(), authorLine(a),
                image == null ? null : image.getUrl(), a.getFeaturedImageAlt(),
                image == null ? null : image.getWidth(), image == null ? null : image.getHeight(),
                a.getReadingMinutes(), a.getPublishedAt(), a.getUpdatedAt(), a.isFeatured());
    }

    static ArticleAdminSummaryResponse toAdminSummary(Article a, Instant now) {
        return new ArticleAdminSummaryResponse(a.getId(), a.getSlug(), a.getTitle(), a.statusAt(now),
                a.getPublishedAt(), a.getCategory().getName(), a.getAuthor().getId(),
                a.getAuthor().getDisplayName(), a.isFeatured(), a.getUpdatedAt());
    }

    static ArticleAdminResponse toAdmin(Article a, Instant now) {
        Image image = a.getFeaturedImage();
        return new ArticleAdminResponse(a.getId(), a.getSlug(), a.getTitle(), a.getDek(), a.getSummary(),
                a.getContentHtml(), a.statusAt(now), a.getPublishedAt(), a.getCategory().getId(),
                a.getCategory().getName(), a.getTags().stream().map(Tag::getName).toList(),
                image == null ? null : image.getId(), image == null ? null : image.getUrl(),
                a.getFeaturedImageAlt(), a.getByline(), a.isFeatured(), a.getAuthor().getId(),
                a.getAuthor().getDisplayName(), a.getReadingMinutes(), a.getCreatedAt(), a.getUpdatedAt());
    }

    private static CategoryRef categoryRef(Article a) {
        return new CategoryRef(a.getCategory().getName(), a.getCategory().getSlug());
    }

    private static String authorLine(Article a) {
        return StringUtils.hasText(a.getByline()) ? a.getByline() : a.getAuthor().getDisplayName();
    }
}
