package com.laaccion.poll;

import com.laaccion.common.ClientIpResolver;
import com.laaccion.common.PageResponse;
import com.laaccion.common.Pagination;
import com.laaccion.poll.PollDtos.PollResponse;
import com.laaccion.poll.PollDtos.VoteRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Encuestas públicas: consulta y voto anónimo. */
@RestController
@RequestMapping("/api/v1/polls")
public class PollController {

    private final PollService pollService;
    private final ClientIpResolver clientIpResolver;

    public PollController(PollService pollService, ClientIpResolver clientIpResolver) {
        this.pollService = pollService;
        this.clientIpResolver = clientIpResolver;
    }

    @GetMapping
    public PageResponse<PollResponse> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return pollService.listPublic(Pagination.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    }

    @GetMapping("/{id}")
    public PollResponse get(@PathVariable Long id) {
        return pollService.getPublic(id);
    }

    @PostMapping("/{id}/votes")
    public PollResponse vote(@PathVariable Long id, @Valid @RequestBody VoteRequest request,
            HttpServletRequest httpRequest) {
        return pollService.vote(id, request.optionId(), request.captchaToken(),
                clientIpResolver.resolve(httpRequest));
    }
}
