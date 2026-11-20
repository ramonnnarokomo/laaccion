package com.laaccion.article;

import com.laaccion.article.ArticleDtos.ArticleAdminResponse;
import com.laaccion.article.ArticleDtos.ArticleAdminSummaryResponse;
import com.laaccion.article.ArticleDtos.ArticleDetailResponse;
import com.laaccion.article.ArticleDtos.ArticleRequest;
import com.laaccion.article.ArticleDtos.ArticleSummaryResponse;
import com.laaccion.audit.AuditService;
import com.laaccion.category.Category;
import com.laaccion.category.CategoryRepository;
import com.laaccion.common.PageResponse;
import com.laaccion.common.SlugGenerator;
import com.laaccion.common.error.BadRequestException;
import com.laaccion.common.error.ConflictException;
import com.laaccion.common.error.NotFoundException;
import com.laaccion.image.Image;
import com.laaccion.image.ImageRepository;
import com.laaccion.security.AppUserPrincipal;
import com.laaccion.tag.TagService;
import com.laaccion.user.UserRepository;
import java.time.Clock;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ArticleService {

    private static final int MAX_SLUG_ATTEMPTS = 50;

    private final ArticleRepository articleRepository;
    private final CategoryRepository categoryRepository;
    private final ImageRepository imageRepository;
    private final UserRepository userRepository;
    private final TagService tagService;
    private final HtmlSanitizer htmlSanitizer;
    private final AuditService auditService;
    private final Clock clock;

    public ArticleService(ArticleRepository articleRepository, CategoryRepository categoryRepository,
            ImageRepository imageRepository, UserRepository userRepository, TagService tagService,
            HtmlSanitizer htmlSanitizer, AuditService auditService, Clock clock) {
        this.articleRepository = articleRepository;
        this.categoryRepository = categoryRepository;
        this.imageRepository = imageRepository;
        this.userRepository = userRepository;
        this.tagService = tagService;
        this.htmlSanitizer = htmlSanitizer;
        this.auditService = auditService;
        this.clock = clock;
    }

    // ---------------------------------------------------------------- Público

    @Transactional(readOnly = true)
    public PageResponse<ArticleSummaryResponse> listVisible(String categorySlug, String tagSlug, Pageable pageable) {
        Instant now = clock.instant();
        Page<Article> page;
        if (StringUtils.hasText(tagSlug)) {
            page = articleRepository.findVisibleByTag(ArticleStatus.PUBLISHED, now, tagSlug, pageable);
        } else if (StringUtils.hasText(categorySlug)) {
            page = articleRepository.findVisibleByCategory(ArticleStatus.PUBLISHED, now, categorySlug, pageable);
        } else {
            page = articleRepository.findVisible(ArticleStatus.PUBLISHED, now, pageable);
        }
        return PageResponse.of(page, ArticleMapper::toSummary);
    }

    @Transactional(readOnly = true)
    public ArticleDetailResponse getVisibleBySlug(String slug) {
        // Un borrador o un artículo programado responde 404, igual que si no existiera.
        return articleRepository.findBySlug(slug)
                .filter(article -> article.isVisibleAt(clock.instant()))
                .map(ArticleMapper::toDetail)
                .orElseThrow(() -> new NotFoundException("Artículo no encontrado."));
    }

    // ------------------------------------------------------- Panel editorial

    @Transactional(readOnly = true)
    public PageResponse<ArticleAdminSummaryResponse> listForAdmin(ArticleStatus status, Pageable pageable) {
        Instant now = clock.instant();
        Page<Article> page;
        if (status == null) {
            page = articleRepository.findAllForAdmin(pageable);
        } else {
            page = switch (status) {
                case DRAFT -> articleRepository.findDrafts(ArticleStatus.DRAFT, pageable);
                case SCHEDULED -> articleRepository.findScheduled(ArticleStatus.PUBLISHED, now, pageable);
                case PUBLISHED -> articleRepository.findPublishedForAdmin(ArticleStatus.PUBLISHED, now, pageable);
            };
        }
        return PageResponse.of(page, article -> ArticleMapper.toAdminSummary(article, now));
    }

    @Transactional(readOnly = true)
    public ArticleAdminResponse getForAdmin(Long id) {
        return ArticleMapper.toAdmin(findDetail(id), clock.instant());
    }

    @Transactional
    public ArticleAdminResponse create(ArticleRequest request, AppUserPrincipal me) {
        Article article = new Article();
        article.setAuthor(userRepository.getReferenceById(me.getId()));
        article.setSlug(uniqueSlug(StringUtils.hasText(request.slug()) ? request.slug() : request.title()));
        apply(article, request);
        articleRepository.saveAndFlush(article);
        auditService.record("ARTICLE_CREATED", "article", article.getId(), describe(article));
        return ArticleMapper.toAdmin(article, clock.instant());
    }

    @Transactional
    public ArticleAdminResponse update(Long id, ArticleRequest request, AppUserPrincipal me) {
        Article article = findDetail(id);
        requireCanModify(article, me);

        if (StringUtils.hasText(request.slug()) && !request.slug().equals(article.getSlug())) {
            if (article.isVisibleAt(clock.instant())) {
                // Cambiar la URL de algo ya publicado rompe enlaces compartidos y posicionamiento.
                throw new ConflictException("No se puede cambiar el slug de un artículo ya publicado.");
            }
            if (articleRepository.existsBySlug(request.slug())) {
                throw new ConflictException("Ya existe un artículo con ese slug.");
            }
            article.setSlug(request.slug());
        }
        apply(article, request);
        articleRepository.flush(); // para que la respuesta lleve ya la fecha de modificación nueva
        auditService.record("ARTICLE_UPDATED", "article", article.getId(), describe(article));
        return ArticleMapper.toAdmin(article, clock.instant());
    }

    @Transactional
    public void delete(Long id, AppUserPrincipal me) {
        Article article = findDetail(id);
        requireCanModify(article, me);
        String description = describe(article);
        articleRepository.delete(article);
        auditService.record("ARTICLE_DELETED", "article", id, description);
    }

    // ---------------------------------------------------------------- Interno

    private void apply(Article article, ArticleRequest request) {
        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new BadRequestException("La sección indicada no existe."));
        Image image = null;
        if (request.featuredImageId() != null) {
            image = imageRepository.findById(request.featuredImageId())
                    .orElseThrow(() -> new BadRequestException("La imagen destacada indicada no existe."));
            if (!StringUtils.hasText(request.featuredImageAlt())) {
                // Accesibilidad (WCAG): la imagen destacada necesita texto alternativo.
                throw new BadRequestException("La imagen destacada necesita un texto alternativo.");
            }
        }

        String cleanHtml = htmlSanitizer.sanitize(request.contentHtml());
        article.setTitle(request.title().trim());
        article.setDek(trimToNull(request.dek()));
        article.setSummary(request.summary().trim());
        article.setContentHtml(cleanHtml);
        article.setReadingMinutes(htmlSanitizer.readingMinutes(cleanHtml));
        article.setCategory(category);
        article.setFeaturedImage(image);
        article.setFeaturedImageAlt(image == null ? null : request.featuredImageAlt().trim());
        article.setByline(trimToNull(request.byline()));
        article.setFeatured(Boolean.TRUE.equals(request.featured()));
        article.setTags(tagService.resolve(request.tags()));
        applyStatus(article, request);
    }

    private void applyStatus(Article article, ArticleRequest request) {
        Instant now = clock.instant();
        switch (request.status()) {
            case DRAFT -> {
                article.setStatus(ArticleStatus.DRAFT);
                article.setPublishedAt(null);
            }
            case SCHEDULED -> {
                if (request.publishedAt() == null || !request.publishedAt().isAfter(now)) {
                    throw new BadRequestException("Para programar un artículo indica una fecha de publicación futura.");
                }
                article.setStatus(ArticleStatus.PUBLISHED);
                article.setPublishedAt(request.publishedAt());
            }
            case PUBLISHED -> {
                if (request.publishedAt() != null && request.publishedAt().isAfter(now)) {
                    throw new BadRequestException("La fecha es futura: usa el estado SCHEDULED para programar.");
                }
                Instant publishedAt = request.publishedAt();
                if (publishedAt == null) {
                    // Si ya estaba publicado se conserva su fecha original; si no, se publica ahora.
                    publishedAt = article.isVisibleAt(now) ? article.getPublishedAt() : now;
                }
                article.setStatus(ArticleStatus.PUBLISHED);
                article.setPublishedAt(publishedAt);
            }
        }
    }

    /** Control de acceso por recurso (IDOR): un editor solo toca sus artículos; un admin, todos. */
    private void requireCanModify(Article article, AppUserPrincipal me) {
        if (!me.isAdmin() && !article.getAuthor().getId().equals(me.getId())) {
            throw new AccessDeniedException("Solo puedes modificar tus propios artículos.");
        }
    }

    private String uniqueSlug(String source) {
        String base = SlugGenerator.slugify(source);
        if (base.isEmpty()) {
            base = "articulo";
        }
        String candidate = base;
        for (int i = 2; articleRepository.existsBySlug(candidate); i++) {
            if (i > MAX_SLUG_ATTEMPTS) {
                throw new ConflictException("No se ha podido generar un slug único. Indica uno a mano.");
            }
            candidate = base + "-" + i;
        }
        return candidate;
    }

    private Article findDetail(Long id) {
        return articleRepository.findDetailById(id)
                .orElseThrow(() -> new NotFoundException("Artículo no encontrado."));
    }

    private static String describe(Article article) {
        return article.getSlug() + " [" + article.getStatus() + "]";
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
