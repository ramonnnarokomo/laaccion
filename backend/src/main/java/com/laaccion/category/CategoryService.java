package com.laaccion.category;

import com.laaccion.article.ArticleRepository;
import com.laaccion.audit.AuditService;
import com.laaccion.category.CategoryDtos.CategoryRequest;
import com.laaccion.category.CategoryDtos.CategoryResponse;
import com.laaccion.common.SlugGenerator;
import com.laaccion.common.error.BadRequestException;
import com.laaccion.common.error.ConflictException;
import com.laaccion.common.error.NotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ArticleRepository articleRepository;
    private final AuditService auditService;

    public CategoryService(CategoryRepository categoryRepository, ArticleRepository articleRepository,
            AuditService auditService) {
        this.categoryRepository = categoryRepository;
        this.articleRepository = articleRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        return categoryRepository.findAllByOrderBySortOrderAscNameAsc().stream().map(CategoryResponse::from).toList();
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        Category category = new Category();
        apply(category, request);
        categoryRepository.save(category);
        auditService.record("CATEGORY_CREATED", "category", category.getId(), category.getName());
        return CategoryResponse.from(category);
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = find(id);
        apply(category, request);
        auditService.record("CATEGORY_UPDATED", "category", category.getId(), category.getName());
        return CategoryResponse.from(category);
    }

    @Transactional
    public void delete(Long id) {
        Category category = find(id);
        if (articleRepository.existsByCategoryId(id)) {
            throw new ConflictException("No se puede borrar una sección que tiene artículos.");
        }
        categoryRepository.delete(category);
        auditService.record("CATEGORY_DELETED", "category", id, category.getName());
    }

    private void apply(Category category, CategoryRequest request) {
        String slug = StringUtils.hasText(request.slug()) ? request.slug() : SlugGenerator.slugify(request.name());
        if (slug.isEmpty()) {
            throw new BadRequestException("El nombre no permite generar un slug válido.");
        }
        if (!slug.equals(category.getSlug()) && categoryRepository.existsBySlug(slug)) {
            throw new ConflictException("Ya existe una sección con ese slug.");
        }
        category.setName(request.name().trim());
        category.setSlug(slug);
        category.setDescription(StringUtils.hasText(request.description()) ? request.description().trim() : null);
        category.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
    }

    private Category find(Long id) {
        return categoryRepository.findById(id).orElseThrow(() -> new NotFoundException("Sección no encontrada."));
    }
}
