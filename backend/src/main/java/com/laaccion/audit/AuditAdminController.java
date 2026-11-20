package com.laaccion.audit;

import com.laaccion.common.PageResponse;
import com.laaccion.common.Pagination;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Consulta del registro de auditoría. Solo administradores. */
@RestController
@RequestMapping("/api/v1/admin/audit")
@PreAuthorize("hasRole('ADMIN')")
public class AuditAdminController {

    private final AuditService auditService;

    public AuditAdminController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    public PageResponse<AuditLogResponse> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return auditService.list(Pagination.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    }
}
