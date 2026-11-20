package com.laaccion.poll;

import com.laaccion.user.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.BatchSize;

@Entity
@Table(name = "poll")
public class Poll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 300)
    private String question;

    @Column(length = 1000)
    private String description;

    /** Enlace al vídeo-encuesta de redes (YouTube, TikTok o Instagram). */
    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PollStatus status = PollStatus.DRAFT;

    /** Cierre automático opcional. */
    @Column(name = "closes_at")
    private Instant closesAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder asc")
    @BatchSize(size = 50)
    private List<PollOption> options = new ArrayList<>();

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

    /** Estado efectivo: una encuesta abierta cuya fecha de cierre ya pasó cuenta como cerrada. */
    public PollStatus statusAt(Instant now) {
        if (status == PollStatus.OPEN && closesAt != null && !closesAt.isAfter(now)) {
            return PollStatus.CLOSED;
        }
        return status;
    }

    public void replaceOptions(List<String> labels) {
        options.clear();
        for (int i = 0; i < labels.size(); i++) {
            options.add(new PollOption(this, labels.get(i).trim(), i));
        }
    }

    public Long getId() { return id; }
    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
    public PollStatus getStatus() { return status; }
    public void setStatus(PollStatus status) { this.status = status; }
    public Instant getClosesAt() { return closesAt; }
    public void setClosesAt(Instant closesAt) { this.closesAt = closesAt; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<PollOption> getOptions() { return options; }
}
