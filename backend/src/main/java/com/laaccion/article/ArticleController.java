package com.laaccion.article;

import com.laaccion.article.ArticleDtos.ArticleDetailResponse;
import com.laaccion.article.ArticleDtos.ArticleSummaryResponse;
import com.laaccion.common.PageResponse;
import com.laaccion.common.Pagination;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Lectura pública de artículos publicados. */
@RestController
@RequestMapping("/api/v1/articles")
public class ArticleController {

    private final ArticleService articleService;

    public ArticleController(ArticleService articleService) {
        this.articleService = articleService;
    }

    /** Listado paginado, del más reciente al más antiguo. Filtros opcionales: sección o etiqueta (por slug). */
    @GetMapping
    public PageResponse<ArticleSummaryResponse> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return articleService.listVisible(category, tag,
                Pagination.of(page, size, Sort.by(Sort.Direction.DESC, "publishedAt", "id")));
    }

    @GetMapping("/{slug}")
    public ArticleDetailResponse get(@PathVariable String slug) {
        return articleService.getVisibleBySlug(slug);
    }
}
