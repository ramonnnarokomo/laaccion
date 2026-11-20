package com.laaccion.poll;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class PollDtos {

    private PollDtos() {
    }

    public record PollOptionResponse(Long id, String label, long votes, double percentage) {
    }

    /** Encuesta con resultados agregados. Nunca incluye información de quién ha votado. */
    public record PollResponse(Long id, String question, String description, String videoUrl, PollStatus status,
                               Instant closesAt, long totalVotes, List<PollOptionResponse> options,
                               Instant createdAt) {

        public static PollResponse from(Poll poll, Instant now) {
            long total = poll.getOptions().stream().mapToLong(PollOption::getVotesCount).sum();
            List<PollOptionResponse> options = poll.getOptions().stream()
                    .map(o -> new PollOptionResponse(o.getId(), o.getLabel(), o.getVotesCount(),
                            total == 0 ? 0.0 : Math.round(o.getVotesCount() * 1000.0 / total) / 10.0))
                    .toList();
            return new PollResponse(poll.getId(), poll.getQuestion(), poll.getDescription(), poll.getVideoUrl(),
                    poll.statusAt(now), poll.getClosesAt(), total, options, poll.getCreatedAt());
        }
    }

    public record PollRequest(
            @NotBlank @Size(max = 300) String question,
            @Size(max = 1000) String description,
            @Size(max = 500) String videoUrl,
            Instant closesAt,
            @NotNull @Size(min = 2, max = 10) List<@NotBlank @Size(max = 200) String> options) {
    }

    public record VoteRequest(@NotNull Long optionId, @Size(max = 2048) String captchaToken) {
    }
}
