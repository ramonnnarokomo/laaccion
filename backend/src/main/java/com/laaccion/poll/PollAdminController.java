package com.laaccion.poll;

import com.laaccion.common.PageResponse;
import com.laaccion.common.Pagination;
import com.laaccion.poll.PollDtos.PollRequest;
import com.laaccion.poll.PollDtos.PollResponse;
import com.laaccion.security.AppUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

@RestController
@RequestMapping("/api/v1/admin/polls")
@PreAuthorize("hasAnyRole('ADMIN', 'EDITOR')")
public class PollAdminController {

    private final PollService pollService;

    public PollAdminController(PollService pollService) {
        this.pollService = pollService;
    }

    @GetMapping
    public PageResponse<PollResponse> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return pollService.listForAdmin(Pagination.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    }

    @GetMapping("/{id}")
    public PollResponse get(@PathVariable Long id) {
        return pollService.getForAdmin(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PollResponse create(@Valid @RequestBody PollRequest request,
            @AuthenticationPrincipal AppUserPrincipal me) {
        return pollService.create(request, me);
    }

    @PutMapping("/{id}")
    public PollResponse update(@PathVariable Long id, @Valid @RequestBody PollRequest request) {
        return pollService.update(id, request);
    }

    @PostMapping("/{id}/open")
    public PollResponse open(@PathVariable Long id) {
        return pollService.open(id);
    }

    @PostMapping("/{id}/close")
    public PollResponse close(@PathVariable Long id) {
        return pollService.close(id);
    }

    /** Borrar una encuesta elimina también sus resultados: solo un administrador. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        pollService.delete(id);
    }
}
