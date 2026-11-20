package com.laaccion.announcement;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/** Anuncio de El Tablón. Pasa solo a "caducado" cuando su fecha de evento queda atrás. */
@Entity
@Table(name = "announcement")
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 90)
    private String section;

    @Column(nullable = false, length = 110)
    private String title;

    @Column(nullable = false, length = 280)
    private String description;

    /** Datos prácticos (día, hora, lugar). Texto plano; los saltos de línea se guardan como \n. */
    @Column(length = 180)
    private String details;

    @Column(length = 500)
    private String url;

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Column(nullable = false, length = 35)
    private String stamp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Tone tone = Tone.IVORY;

    @Column(nullable = false)
    private boolean visible = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

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

    public AnnouncementState stateOn(LocalDate today) {
        if (!visible) {
            return AnnouncementState.HIDDEN;
        }
        return eventDate.isBefore(today) ? AnnouncementState.EXPIRED : AnnouncementState.ACTIVE;
    }

    public Long getId() { return id; }
    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }
    public String getStamp() { return stamp; }
    public void setStamp(String stamp) { this.stamp = stamp; }
    public Tone getTone() { return tone; }
    public void setTone(Tone tone) { this.tone = tone; }
    public boolean isVisible() { return visible; }
    public void setVisible(boolean visible) { this.visible = visible; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
