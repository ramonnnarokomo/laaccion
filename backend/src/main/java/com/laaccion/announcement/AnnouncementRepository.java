package com.laaccion.announcement;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    // Tablón público: vigentes por fecha más próxima; caducados del más reciente al más antiguo.
    List<Announcement> findByVisibleTrueAndEventDateGreaterThanEqualOrderByEventDateAscIdAsc(LocalDate today,
            Pageable limit);

    List<Announcement> findByVisibleTrueAndEventDateLessThanOrderByEventDateDescIdDesc(LocalDate today,
            Pageable limit);

    // Panel editorial.
    Page<Announcement> findByVisibleTrueAndEventDateGreaterThanEqual(LocalDate today, Pageable pageable);

    Page<Announcement> findByVisibleTrueAndEventDateLessThan(LocalDate today, Pageable pageable);

    Page<Announcement> findByVisibleFalse(Pageable pageable);

    long countByVisibleTrueAndEventDateGreaterThanEqual(LocalDate today);

    long countByVisibleTrueAndEventDateLessThan(LocalDate today);

    long countByVisibleFalse();
}
