package com.laaccion.announcement;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class AnnouncementDtos {

    private AnnouncementDtos() {
    }

    /** Cartel tal y como lo pinta el tablón público. */
    public record AnnouncementResponse(Long id, String section, String title, String description, String details,
                                       String url, LocalDate eventDate, String stamp, Tone tone) {

        public static AnnouncementResponse from(Announcement a) {
            return new AnnouncementResponse(a.getId(), a.getSection(), a.getTitle(), a.getDescription(),
                    a.getDetails(), a.getUrl(), a.getEventDate(), a.getStamp(), a.getTone());
        }
    }

    /** Tablón público: como mucho N vigentes y M caducados (por defecto 10 y 25, como en la maqueta). */
    public record BoardResponse(LocalDate today, List<AnnouncementResponse> active,
                                List<AnnouncementResponse> expired) {
    }

    public record AnnouncementAdminResponse(Long id, String section, String title, String description,
                                            String details, String url, LocalDate eventDate, String stamp,
                                            Tone tone, boolean visible, AnnouncementState state,
                                            Instant updatedAt) {

        public static AnnouncementAdminResponse from(Announcement a, LocalDate today) {
            return new AnnouncementAdminResponse(a.getId(), a.getSection(), a.getTitle(), a.getDescription(),
                    a.getDetails(), a.getUrl(), a.getEventDate(), a.getStamp(), a.getTone(), a.isVisible(),
                    a.stateOn(today), a.getUpdatedAt());
        }
    }

    public record AnnouncementMetrics(long total, long active, long expired, long hidden) {
    }

    /** Mismos campos y límites que la ficha del panel de la maqueta. */
    public record AnnouncementRequest(
            @NotBlank @Size(max = 90) String section,
            @NotBlank @Size(max = 110) String title,
            @NotBlank @Size(max = 280) String description,
            @Size(max = 180) String details,
            @Size(max = 500) String url,
            @NotNull LocalDate eventDate,
            @Size(max = 35) String stamp,
            Tone tone,
            Boolean visible) {
    }
}
