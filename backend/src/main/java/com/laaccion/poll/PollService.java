package com.laaccion.poll;

import com.laaccion.audit.AuditService;
import com.laaccion.captcha.CaptchaVerifier;
import com.laaccion.common.PageResponse;
import com.laaccion.common.RateLimiter;
import com.laaccion.common.error.BadRequestException;
import com.laaccion.common.error.ConflictException;
import com.laaccion.common.error.NotFoundException;
import com.laaccion.common.error.TooManyRequestsException;
import com.laaccion.config.AppProperties;
import com.laaccion.poll.PollDtos.PollRequest;
import com.laaccion.poll.PollDtos.PollResponse;
import com.laaccion.security.AppUserPrincipal;
import com.laaccion.user.UserRepository;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

@Service
public class PollService {

    private static final Set<String> VIDEO_HOSTS = Set.of(
            "youtube.com", "www.youtube.com", "youtu.be",
            "tiktok.com", "www.tiktok.com",
            "instagram.com", "www.instagram.com");

    private final PollRepository pollRepository;
    private final PollOptionRepository optionRepository;
    private final UserRepository userRepository;
    private final CaptchaVerifier captchaVerifier;
    private final VoterHasher voterHasher;
    private final RateLimiter rateLimiter;
    private final AuditService auditService;
    private final AppProperties properties;
    private final Clock clock;
    private final TransactionTemplate transactionTemplate;

    public PollService(PollRepository pollRepository, PollOptionRepository optionRepository,
            UserRepository userRepository, CaptchaVerifier captchaVerifier, VoterHasher voterHasher,
            RateLimiter rateLimiter, AuditService auditService, AppProperties properties, Clock clock,
            PlatformTransactionManager transactionManager) {
        this.pollRepository = pollRepository;
        this.optionRepository = optionRepository;
        this.userRepository = userRepository;
        this.captchaVerifier = captchaVerifier;
        this.voterHasher = voterHasher;
        this.rateLimiter = rateLimiter;
        this.auditService = auditService;
        this.properties = properties;
        this.clock = clock;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    // ---------------------------------------------------------------- Público

    @Transactional(readOnly = true)
    public PageResponse<PollResponse> listPublic(Pageable pageable) {
        Instant now = clock.instant();
        return PageResponse.of(
                pollRepository.findByStatusIn(List.of(PollStatus.OPEN, PollStatus.CLOSED), pageable),
                poll -> PollResponse.from(poll, now));
    }

    @Transactional(readOnly = true)
    public PollResponse getPublic(Long id) {
        Poll poll = find(id);
        if (poll.getStatus() == PollStatus.DRAFT) {
            throw new NotFoundException("Encuesta no encontrada.");
        }
        return PollResponse.from(poll, clock.instant());
    }

    /**
     * Registra un voto anónimo. Orden de las comprobaciones: límite por IP, captcha, encuesta
     * abierta, opción válida y, por último, que esa IP no haya votado ya en esta encuesta.
     *
     * <p>El captcha (una llamada HTTP a Cloudflare) se verifica fuera de la transacción para no
     * retener una conexión de base de datos mientras tanto.
     */
    public PollResponse vote(Long pollId, Long optionId, String captchaToken, String clientIp) {
        if (!rateLimiter.tryAcquire("vote:" + clientIp, properties.rateLimit().votePerMinute(),
                Duration.ofMinutes(1))) {
            throw new TooManyRequestsException("Demasiados votos seguidos. Espera un minuto.");
        }
        if (!captchaVerifier.verify(captchaToken, clientIp)) {
            throw new BadRequestException("No se ha podido verificar el captcha. Vuelve a intentarlo.");
        }
        String voterHash = voterHasher.hash(pollId, clientIp);
        return transactionTemplate.execute(status -> registerVote(pollId, optionId, voterHash));
    }

    private PollResponse registerVote(Long pollId, Long optionId, String voterHash) {
        Poll poll = find(pollId);
        Instant now = clock.instant();
        if (poll.getStatus() == PollStatus.DRAFT) {
            throw new NotFoundException("Encuesta no encontrada.");
        }
        if (poll.statusAt(now) != PollStatus.OPEN) {
            throw new ConflictException("Esta encuesta ya está cerrada.");
        }
        if (!optionRepository.existsByIdAndPollId(optionId, pollId)) {
            throw new BadRequestException("La opción indicada no pertenece a esta encuesta.");
        }
        if (optionRepository.registerVoter(pollId, voterHash) == 0) {
            throw new ConflictException("Ya se ha votado en esta encuesta desde tu conexión.");
        }
        optionRepository.incrementVotes(optionId, pollId);
        // Las sentencias anteriores vacían la caché de JPA: se recarga para devolver el recuento real.
        return PollResponse.from(find(pollId), now);
    }

    // ------------------------------------------------------- Panel editorial

    @Transactional(readOnly = true)
    public PageResponse<PollResponse> listForAdmin(Pageable pageable) {
        Instant now = clock.instant();
        return PageResponse.of(pollRepository.findAll(pageable), poll -> PollResponse.from(poll, now));
    }

    @Transactional(readOnly = true)
    public PollResponse getForAdmin(Long id) {
        return PollResponse.from(find(id), clock.instant());
    }

    @Transactional
    public PollResponse create(PollRequest request, AppUserPrincipal me) {
        Poll poll = new Poll();
        poll.setCreatedBy(userRepository.getReferenceById(me.getId()));
        applyTexts(poll, request);
        poll.replaceOptions(request.options());
        pollRepository.saveAndFlush(poll);
        auditService.record("POLL_CREATED", "poll", poll.getId(), poll.getQuestion());
        return PollResponse.from(poll, clock.instant());
    }

    @Transactional
    public PollResponse update(Long id, PollRequest request) {
        Poll poll = find(id);
        applyTexts(poll, request);
        List<String> current = poll.getOptions().stream().map(PollOption::getLabel).toList();
        List<String> requested = request.options().stream().map(String::trim).toList();
        if (!current.equals(requested)) {
            if (poll.getStatus() != PollStatus.DRAFT) {
                // Cambiar las opciones con la votación en marcha falsearía el resultado.
                throw new ConflictException("Las opciones solo se pueden cambiar mientras la encuesta es un borrador.");
            }
            poll.replaceOptions(requested);
        }
        pollRepository.flush();
        auditService.record("POLL_UPDATED", "poll", id, poll.getQuestion());
        return PollResponse.from(poll, clock.instant());
    }

    @Transactional
    public PollResponse open(Long id) {
        Poll poll = find(id);
        if (poll.getStatus() != PollStatus.DRAFT) {
            throw new ConflictException("Solo se puede abrir una encuesta en borrador.");
        }
        poll.setStatus(PollStatus.OPEN);
        auditService.record("POLL_OPENED", "poll", id, poll.getQuestion());
        return PollResponse.from(poll, clock.instant());
    }

    @Transactional
    public PollResponse close(Long id) {
        Poll poll = find(id);
        if (poll.getStatus() != PollStatus.OPEN) {
            throw new ConflictException("Solo se puede cerrar una encuesta abierta.");
        }
        poll.setStatus(PollStatus.CLOSED);
        auditService.record("POLL_CLOSED", "poll", id, poll.getQuestion());
        // Minimización de datos: cerrada la votación, sobran los hashes de control de duplicados.
        optionRepository.purgeVoters(id);
        return PollResponse.from(find(id), clock.instant());
    }

    @Transactional
    public void delete(Long id) {
        Poll poll = find(id);
        String question = poll.getQuestion();
        pollRepository.delete(poll);
        auditService.record("POLL_DELETED", "poll", id, question);
    }

    // ---------------------------------------------------------------- Interno

    private void applyTexts(Poll poll, PollRequest request) {
        poll.setQuestion(request.question().trim());
        poll.setDescription(StringUtils.hasText(request.description()) ? request.description().trim() : null);
        poll.setVideoUrl(validateVideoUrl(request.videoUrl()));
        poll.setClosesAt(request.closesAt());
    }

    /** El vídeo se incrusta en la web: solo se admiten enlaces https de las plataformas previstas. */
    private static String validateVideoUrl(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        try {
            URI uri = URI.create(raw.trim());
            if ("https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null
                    && VIDEO_HOSTS.contains(uri.getHost().toLowerCase(Locale.ROOT))) {
                return uri.toString();
            }
        } catch (IllegalArgumentException ex) {
            // se trata abajo como enlace no válido
        }
        throw new BadRequestException("El vídeo debe ser un enlace https de YouTube, TikTok o Instagram.");
    }

    private Poll find(Long id) {
        return pollRepository.findById(id).orElseThrow(() -> new NotFoundException("Encuesta no encontrada."));
    }
}
