package com.laaccion.poll;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PollOptionRepository extends JpaRepository<PollOption, Long> {

    boolean existsByIdAndPollId(Long id, Long pollId);

    /**
     * Apunta que ese votante (hash) ya ha votado en la encuesta. Devuelve 1 si es su primer voto y
     * 0 si ya había votado. No se guarda qué opción eligió.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "insert into poll_vote (poll_id, voter_hash, created_at) "
            + "values (:pollId, :voterHash, now()) on conflict (poll_id, voter_hash) do nothing",
            nativeQuery = true)
    int registerVoter(@Param("pollId") Long pollId, @Param("voterHash") String voterHash);

    /** Incremento atómico en base de datos: no se pierden votos aunque lleguen a la vez. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update PollOption o set o.votesCount = o.votesCount + 1 where o.id = :optionId and o.poll.id = :pollId")
    int incrementVotes(@Param("optionId") Long optionId, @Param("pollId") Long pollId);

    /** Al cerrar la encuesta se borran los registros de control de duplicados: ya no hacen falta. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "delete from poll_vote where poll_id = :pollId", nativeQuery = true)
    int purgeVoters(@Param("pollId") Long pollId);
}
