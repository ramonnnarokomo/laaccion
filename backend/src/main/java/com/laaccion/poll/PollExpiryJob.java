package com.laaccion.poll;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Cada 15 minutos cierra las encuestas que han llegado a su fecha de cierre. Sin esto, una encuesta
 * con {@code closesAt} deja de admitir votos (lo decide {@link Poll#statusAt}) pero conserva los
 * hashes de los votantes, que solo se borraban al cerrarla a mano.
 */
@Component
public class PollExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(PollExpiryJob.class);

    private final PollService pollService;

    public PollExpiryJob(PollService pollService) {
        this.pollService = pollService;
    }

    @Scheduled(initialDelayString = "PT1M", fixedDelayString = "PT15M")
    public void closeExpiredPolls() {
        int closed = pollService.closeExpired();
        if (closed > 0) {
            log.info("Cerradas {} encuestas vencidas y borrados sus hashes de votantes.", closed);
        }
    }
}
