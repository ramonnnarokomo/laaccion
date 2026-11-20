package com.laaccion.user;

import com.laaccion.audit.AuditService;
import com.laaccion.common.PageResponse;
import com.laaccion.common.error.BadRequestException;
import com.laaccion.common.error.ConflictException;
import com.laaccion.common.error.NotFoundException;
import com.laaccion.config.AppProperties;
import com.laaccion.security.AppUserPrincipal;
import com.laaccion.user.UserDtos.CreateUserRequest;
import com.laaccion.user.UserDtos.UpdateUserRequest;
import com.laaccion.user.UserDtos.UserResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final AppProperties properties;
    private final Clock clock;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditService auditService,
            AppProperties properties, Clock clock) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.properties = properties;
        this.clock = clock;
    }

    public static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> list(Pageable pageable) {
        return PageResponse.of(userRepository.findAll(pageable), UserResponse::from);
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("Ya existe un usuario con ese correo.");
        }
        User user = new User();
        user.setEmail(email);
        user.setDisplayName(request.displayName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        user.setEnabled(true);
        userRepository.save(user);
        auditService.record("USER_CREATED", "user", user.getId(), email + " (" + request.role() + ")");
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request, AppUserPrincipal me) {
        User user = find(id);
        boolean self = user.getId().equals(me.getId());
        if (self && (!request.enabled() || request.role() != Role.ADMIN)) {
            // Evita que el único administrador se quede fuera por error.
            throw new ConflictException("No puedes desactivarte ni quitarte el rol de administrador a ti mismo.");
        }
        user.setDisplayName(request.displayName().trim());
        user.setRole(request.role());
        user.setEnabled(request.enabled());
        auditService.record("USER_UPDATED", "user", user.getId(),
                user.getEmail() + " rol=" + request.role() + " activo=" + request.enabled());
        return UserResponse.from(user);
    }

    @Transactional
    public void resetPassword(Long id, String newPassword) {
        User user = find(id);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        auditService.record("USER_PASSWORD_RESET", "user", user.getId(), user.getEmail());
    }

    @Transactional
    public void changeOwnPassword(Long userId, String currentPassword, String newPassword) {
        User user = find(userId);
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BadRequestException("La contraseña actual no es correcta.");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        auditService.record("USER_PASSWORD_CHANGED", "user", user.getId(), user.getEmail());
    }

    /** Cuenta un intento fallido y bloquea la cuenta temporalmente al llegar al máximo. */
    @Transactional
    public void registerFailedLogin(String email) {
        userRepository.findByEmail(normalizeEmail(email)).ifPresent(user -> {
            int attempts = user.getFailedLoginAttempts() + 1;
            if (attempts >= properties.security().maxLoginAttempts()) {
                Instant until = clock.instant().plus(Duration.ofMinutes(properties.security().lockMinutes()));
                user.setLockedUntil(until);
                user.setFailedLoginAttempts(0);
                auditService.record(user.getId(), user.getEmail(), "ACCOUNT_LOCKED", "user", user.getId(),
                        "Bloqueada hasta " + until);
            } else {
                user.setFailedLoginAttempts(attempts);
            }
        });
    }

    @Transactional
    public void registerSuccessfulLogin(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            user.setLastLoginAt(clock.instant());
            auditService.record(user.getId(), user.getEmail(), "LOGIN", "user", user.getId(), null);
        });
    }

    private User find(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new NotFoundException("Usuario no encontrado."));
    }
}
