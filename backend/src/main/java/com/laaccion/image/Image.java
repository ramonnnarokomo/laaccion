package com.laaccion.image;

import com.laaccion.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "image")
public class Image {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Ruta del fichero dentro del almacenamiento. La genera el servidor, nunca el cliente. */
    @Column(name = "storage_key", nullable = false, length = 200)
    private String storageKey;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    private Integer width;

    private Integer height;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Image() {
    }

    public Image(String storageKey, String url, String contentType, long sizeBytes, Integer width, Integer height,
            User uploadedBy, Instant createdAt) {
        this.storageKey = storageKey;
        this.url = url;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.width = width;
        this.height = height;
        this.uploadedBy = uploadedBy;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public String getStorageKey() { return storageKey; }
    public String getUrl() { return url; }
    public String getContentType() { return contentType; }
    public long getSizeBytes() { return sizeBytes; }
    public Integer getWidth() { return width; }
    public Integer getHeight() { return height; }
    public User getUploadedBy() { return uploadedBy; }
    public Instant getCreatedAt() { return createdAt; }
}
