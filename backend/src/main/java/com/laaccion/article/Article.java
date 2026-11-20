package com.laaccion.article;

import com.laaccion.category.Category;
import com.laaccion.image.Image;
import com.laaccion.tag.Tag;
import com.laaccion.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "article")
public class Article {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String slug;

    @Column(nullable = false, length = 200)
    private String title;

    /** Entradilla ("dek" en la maqueta). */
    @Column(length = 300)
    private String dek;

    @Column(nullable = false, length = 600)
    private String summary;

    /** HTML ya saneado en el servidor. */
    @Column(name = "content_html", nullable = false, columnDefinition = "text")
    private String contentHtml;

    /** Solo DRAFT o PUBLISHED (ver {@link ArticleStatus}). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ArticleStatus status = ArticleStatus.DRAFT;

    /** Firma libre opcional ("Por la redacción"). Si está vacía se usa el nombre del autor. */
    @Column(length = 120)
    private String byline;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "featured_image_id")
    private Image featuredImage;

    @Column(name = "featured_image_alt", length = 250)
    private String featuredImageAlt;

    /** Artículo de apertura de la portada. */
    @Column(nullable = false)
    private boolean featured;

    @Column(name = "reading_minutes", nullable = false)
    private int readingMinutes = 1;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToMany
    @JoinTable(name = "article_tag",
            joinColumns = @JoinColumn(name = "article_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new LinkedHashSet<>();

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    /** Estado efectivo en un instante dado. */
    public ArticleStatus statusAt(Instant now) {
        if (status == ArticleStatus.DRAFT || publishedAt == null) {
            return ArticleStatus.DRAFT;
        }
        return publishedAt.isAfter(now) ? ArticleStatus.SCHEDULED : ArticleStatus.PUBLISHED;
    }

    public boolean isVisibleAt(Instant now) {
        return statusAt(now) == ArticleStatus.PUBLISHED;
    }

    public Long getId() { return id; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDek() { return dek; }
    public void setDek(String dek) { this.dek = dek; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getContentHtml() { return contentHtml; }
    public void setContentHtml(String contentHtml) { this.contentHtml = contentHtml; }
    public ArticleStatus getStatus() { return status; }
    public void setStatus(ArticleStatus status) { this.status = status; }
    public String getByline() { return byline; }
    public void setByline(String byline) { this.byline = byline; }
    public User getAuthor() { return author; }
    public void setAuthor(User author) { this.author = author; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public Image getFeaturedImage() { return featuredImage; }
    public void setFeaturedImage(Image featuredImage) { this.featuredImage = featuredImage; }
    public String getFeaturedImageAlt() { return featuredImageAlt; }
    public void setFeaturedImageAlt(String featuredImageAlt) { this.featuredImageAlt = featuredImageAlt; }
    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }
    public int getReadingMinutes() { return readingMinutes; }
    public void setReadingMinutes(int readingMinutes) { this.readingMinutes = readingMinutes; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }
}
