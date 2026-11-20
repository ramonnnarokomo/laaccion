package com.laaccion.poll;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PollRepository extends JpaRepository<Poll, Long> {

    Page<Poll> findByStatusIn(Collection<PollStatus> statuses, Pageable pageable);

    /** Encuestas abiertas cuya fecha de cierre ya ha pasado (siguen marcadas OPEN en base de datos). */
    List<Poll> findByStatusAndClosesAtLessThanEqual(PollStatus status, Instant now);
}
