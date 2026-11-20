package com.laaccion.audit;

import java.time.Instant;

public record AuditLogResponse(Long id, Long actorId, String actorEmail, String action, String entityType,
                               String entityId, String summary, Instant createdAt) {

    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(log.getId(), log.getActorId(), log.getActorEmail(), log.getAction(),
                log.getEntityType(), log.getEntityId(), log.getSummary(), log.getCreatedAt());
    }
}
