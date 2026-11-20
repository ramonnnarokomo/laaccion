package com.laaccion.audit;

import com.laaccion.common.PageResponse;
import com.laaccion.security.AppUserPrincipal;
import com.laaccion.security.CurrentUser;
import java.time.Clock;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private static final int MAX_SUMMARY = 500;

    private final AuditLogRepository repository;
    private final Clock clock;

    public AuditService(AuditLogRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> list(Pageable pageable) {
        return PageResponse.of(repository.findAll(pageable), AuditLogResponse::from);
    }

    /** Registra una acción a nombre del usuario autenticado (participa en la transacción en curso). */
    @Transactional
    public void record(String action, String entityType, Object entityId, String summary) {
        AppUserPrincipal me = CurrentUser.find().orElse(null);
        record(me == null ? null : me.getId(), me == null ? null : me.getUsername(), action, entityType, entityId,
                summary);
    }

    /** Variante para cuando todavía no hay sesión (p. ej. el propio login). */
    @Transactional
    public void record(Long actorId, String actorEmail, String action, String entityType, Object entityId,
            String summary) {
        String safeSummary = summary != null && summary.length() > MAX_SUMMARY
                ? summary.substring(0, MAX_SUMMARY)
                : summary;
        repository.save(new AuditLog(actorId, actorEmail, action, entityType,
                entityId == null ? null : String.valueOf(entityId), safeSummary, clock.instant()));
    }
}
