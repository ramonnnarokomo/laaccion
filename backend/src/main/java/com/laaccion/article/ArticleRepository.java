package com.laaccion.article;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ArticleRepository extends JpaRepository<Article, Long> {

    // --- Parte pública: solo artículos publicados cuya fecha ya ha llegado ---

    @EntityGraph(attributePaths = {"category", "author", "featuredImage"})
    @Query("select a from Article a where a.status = :published and a.publishedAt <= :now")
    Page<Article> findVisible(@Param("published") ArticleStatus published, @Param("now") Instant now,
            Pageable pageable);

    @EntityGraph(attributePaths = {"category", "author", "featuredImage"})
    @Query("select a from Article a where a.status = :published and a.publishedAt <= :now "
            + "and a.category.slug = :categorySlug")
    Page<Article> findVisibleByCategory(@Param("published") ArticleStatus published, @Param("now") Instant now,
            @Param("categorySlug") String categorySlug, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "author", "featuredImage"})
    @Query("select a from Article a join a.tags t where a.status = :published and a.publishedAt <= :now "
            + "and t.slug = :tagSlug")
    Page<Article> findVisibleByTag(@Param("published") ArticleStatus published, @Param("now") Instant now,
            @Param("tagSlug") String tagSlug, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "author", "featuredImage", "tags"})
    Optional<Article> findBySlug(String slug);

    // --- Panel editorial ---

    @EntityGraph(attributePaths = {"category", "author", "featuredImage", "tags"})
    @Query("select a from Article a where a.id = :id")
    Optional<Article> findDetailById(@Param("id") Long id);

    @EntityGraph(attributePaths = {"category", "author"})
    @Query("select a from Article a")
    Page<Article> findAllForAdmin(Pageable pageable);

    @EntityGraph(attributePaths = {"category", "author"})
    @Query("select a from Article a where a.status = :draft")
    Page<Article> findDrafts(@Param("draft") ArticleStatus draft, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "author"})
    @Query("select a from Article a where a.status = :published and a.publishedAt > :now")
    Page<Article> findScheduled(@Param("published") ArticleStatus published, @Param("now") Instant now,
            Pageable pageable);

    @EntityGraph(attributePaths = {"category", "author"})
    @Query("select a from Article a where a.status = :published and a.publishedAt <= :now")
    Page<Article> findPublishedForAdmin(@Param("published") ArticleStatus published, @Param("now") Instant now,
            Pageable pageable);

    boolean existsBySlug(String slug);

    boolean existsByCategoryId(Long categoryId);

    boolean existsByFeaturedImageId(Long imageId);
}
