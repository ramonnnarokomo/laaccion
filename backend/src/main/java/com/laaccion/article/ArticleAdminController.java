package com.laaccion.article;

import com.laaccion.article.ArticleDtos.ArticleAdminResponse;
import com.laaccion.article.ArticleDtos.ArticleAdminSummaryResponse;
import com.laaccion.article.ArticleDtos.ArticleRequest;
import com.laaccion.common.PageResponse;
import com.laaccion.common.Pagination;
import com.laaccion.security.AppUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Gestión de artículos desde el panel editorial. */
@RestController
@RequestMapping("/api/v1/admin/articles")
@PreAuthorize("hasAnyRole('ADMIN', 'EDITOR')")
public class ArticleAdminController {

    private final ArticleService articleService;

    public ArticleAdminController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @GetMapping
    public PageResponse<ArticleAdminSummaryResponse> list(
            @RequestParam(required = false) ArticleStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return articleService.listForAdmin(status,
                Pagination.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt", "id")));
    }

    @GetMapping("/{id}")
    public ArticleAdminResponse get(@PathVariable Long id) {
        return articleService.getForAdmin(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ArticleAdminResponse create(@Valid @RequestBody ArticleRequest request,
            @AuthenticationPrincipal AppUserPrincipal me) {
        return articleService.create(request, me);
    }

    @PutMapping("/{id}")
    public ArticleAdminResponse update(@PathVariable Long id, @Valid @RequestBody ArticleRequest request,
            @AuthenticationPrincipal AppUserPrincipal me) {
        return articleService.update(id, request, me);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal AppUserPrincipal me) {
        articleService.delete(id, me);
    }
}
