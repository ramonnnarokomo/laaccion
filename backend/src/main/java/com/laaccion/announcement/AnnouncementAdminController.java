package com.laaccion.announcement;

import com.laaccion.announcement.AnnouncementDtos.AnnouncementAdminResponse;
import com.laaccion.announcement.AnnouncementDtos.AnnouncementMetrics;
import com.laaccion.announcement.AnnouncementDtos.AnnouncementRequest;
import com.laaccion.common.PageResponse;
import com.laaccion.common.Pagination;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Gestión del tablón (la "Mesa editorial" de la maqueta). */
@RestController
@RequestMapping("/api/v1/admin/announcements")
@PreAuthorize("hasAnyRole('ADMIN', 'EDITOR')")
public class AnnouncementAdminController {

    private final AnnouncementService announcementService;

    public AnnouncementAdminController(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

    @GetMapping
    public PageResponse<AnnouncementAdminResponse> list(
            @RequestParam(required = false) AnnouncementState state,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return announcementService.listForAdmin(state,
                Pagination.of(page, size, Sort.by(Sort.Direction.DESC, "eventDate", "id")));
    }

    @GetMapping("/metrics")
    public AnnouncementMetrics metrics() {
        return announcementService.metrics();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AnnouncementAdminResponse create(@Valid @RequestBody AnnouncementRequest request) {
        return announcementService.create(request);
    }

    @PutMapping("/{id}")
    public AnnouncementAdminResponse update(@PathVariable Long id, @Valid @RequestBody AnnouncementRequest request) {
        return announcementService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        announcementService.delete(id);
    }
}
