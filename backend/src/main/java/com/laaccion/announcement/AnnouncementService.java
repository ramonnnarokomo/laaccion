package com.laaccion.announcement;

import com.laaccion.announcement.AnnouncementDtos.AnnouncementAdminResponse;
import com.laaccion.announcement.AnnouncementDtos.AnnouncementMetrics;
import com.laaccion.announcement.AnnouncementDtos.AnnouncementRequest;
import com.laaccion.announcement.AnnouncementDtos.AnnouncementResponse;
import com.laaccion.announcement.AnnouncementDtos.BoardResponse;
import com.laaccion.audit.AuditService;
import com.laaccion.common.PageResponse;
import com.laaccion.common.error.BadRequestException;
import com.laaccion.common.error.NotFoundException;
import com.laaccion.config.AppProperties;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AnnouncementService {

    private static final String DEFAULT_STAMP = "Más información";

    private final AnnouncementRepository repository;
    private final AuditService auditService;
    private final Clock clock;
    private final ZoneId zone;
    private final int maxActive;
    private final int maxExpired;

    public AnnouncementService(AnnouncementRepository repository, AuditService auditService, Clock clock,
            AppProperties properties) {
        this.repository = repository;
        this.auditService = auditService;
        this.clock = clock;
        this.zone = ZoneId.of(properties.board().zone());
        this.maxActive = properties.board().maxActive();
        this.maxExpired = properties.board().maxExpired();
    }

    /** "Hoy" se calcula en la zona horaria del periódico, no en la del servidor (que va en UTC). */
    private LocalDate today() {
        return LocalDate.now(clock.withZone(zone));
    }

    @Transactional(readOnly = true)
    public BoardResponse board() {
        LocalDate today = today();
        List<AnnouncementResponse> active = repository
                .findByVisibleTrueAndEventDateGreaterThanEqualOrderByEventDateAscIdAsc(today,
                        PageRequest.of(0, maxActive))
                .stream().map(AnnouncementResponse::from).toList();
        List<AnnouncementResponse> expired = repository
                .findByVisibleTrueAndEventDateLessThanOrderByEventDateDescIdDesc(today,
                        PageRequest.of(0, maxExpired))
                .stream().map(AnnouncementResponse::from).toList();
        return new BoardResponse(today, active, expired);
    }

    @Transactional(readOnly = true)
    public PageResponse<AnnouncementAdminResponse> listForAdmin(AnnouncementState state, Pageable pageable) {
        LocalDate today = today();
        Page<Announcement> page;
        if (state == null) {
            page = repository.findAll(pageable);
        } else {
            page = switch (state) {
                case ACTIVE -> repository.findByVisibleTrueAndEventDateGreaterThanEqual(today, pageable);
                case EXPIRED -> repository.findByVisibleTrueAndEventDateLessThan(today, pageable);
                case HIDDEN -> repository.findByVisibleFalse(pageable);
            };
        }
        return PageResponse.of(page, a -> AnnouncementAdminResponse.from(a, today));
    }

    @Transactional(readOnly = true)
    public AnnouncementMetrics metrics() {
        LocalDate today = today();
        long active = repository.countByVisibleTrueAndEventDateGreaterThanEqual(today);
        long expired = repository.countByVisibleTrueAndEventDateLessThan(today);
        long hidden = repository.countByVisibleFalse();
        return new AnnouncementMetrics(active + expired + hidden, active, expired, hidden);
    }

    @Transactional
    public AnnouncementAdminResponse create(AnnouncementRequest request) {
        Announcement announcement = new Announcement();
        apply(announcement, request);
        repository.saveAndFlush(announcement);
        auditService.record("ANNOUNCEMENT_CREATED", "announcement", announcement.getId(), announcement.getTitle());
        return AnnouncementAdminResponse.from(announcement, today());
    }

    @Transactional
    public AnnouncementAdminResponse update(Long id, AnnouncementRequest request) {
        Announcement announcement = find(id);
        apply(announcement, request);
        repository.flush();
        auditService.record("ANNOUNCEMENT_UPDATED", "announcement", id, announcement.getTitle());
        return AnnouncementAdminResponse.from(announcement, today());
    }

    @Transactional
    public void delete(Long id) {
        Announcement announcement = find(id);
        repository.delete(announcement);
        auditService.record("ANNOUNCEMENT_DELETED", "announcement", id, announcement.getTitle());
    }

    private void apply(Announcement announcement, AnnouncementRequest request) {
        announcement.setSection(request.section().trim());
        announcement.setTitle(request.title().trim());
        announcement.setDescription(request.description().trim());
        announcement.setDetails(StringUtils.hasText(request.details()) ? request.details().trim() : null);
        announcement.setUrl(normalizeUrl(request.url()));
        announcement.setEventDate(request.eventDate());
        announcement.setStamp(StringUtils.hasText(request.stamp()) ? request.stamp().trim() : DEFAULT_STAMP);
        announcement.setTone(request.tone() == null ? Tone.IVORY : request.tone());
        announcement.setVisible(request.visible() == null || request.visible());
    }

    /** Solo se aceptan enlaces http(s); si falta el esquema se asume https, como hacía la maqueta. */
    static String normalizeUrl(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String value = raw.trim();
        String candidate = value.matches("(?i)^https?://.*") ? value : "https://" + value;
        try {
            URI uri = new URI(candidate);
            String scheme = uri.getScheme();
            if (uri.getHost() == null || !("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))) {
                throw new BadRequestException("El enlace debe ser una dirección web válida (http o https).");
            }
            return uri.toString();
        } catch (URISyntaxException ex) {
            throw new BadRequestException("El enlace debe ser una dirección web válida (http o https).");
        }
    }

    private Announcement find(Long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Anuncio no encontrado."));
    }
}
