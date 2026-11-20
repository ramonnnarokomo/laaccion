package com.laaccion.security;

import com.laaccion.config.AppProperties;
import com.laaccion.user.Role;
import com.laaccion.user.User;
import com.laaccion.user.UserRepository;
import com.laaccion.user.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Crea el primer administrador a partir de variables de entorno, solo si no hay ningún usuario.
 * No existe ninguna cuenta ni contraseña por defecto en el código.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    private static final int MIN_PASSWORD_LENGTH = 5;
    private static final int MAX_PASSWORD_LENGTH = 50;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties properties;

    public AdminBootstrap(UserRepository userRepository, PasswordEncoder passwordEncoder, AppProperties properties) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }
        AppProperties.BootstrapAdmin admin = properties.bootstrapAdmin();
        if (!StringUtils.hasText(admin.email()) || !StringUtils.hasText(admin.password())) {
            log.warn("No hay usuarios y no se han definido APP_BOOTSTRAP_ADMIN_EMAIL / "
                    + "APP_BOOTSTRAP_ADMIN_PASSWORD: nadie puede entrar al panel editorial.");
            return;
        }
        int length = admin.password().length();
        if (length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
            throw new IllegalStateException("APP_BOOTSTRAP_ADMIN_PASSWORD debe tener entre "
                    + MIN_PASSWORD_LENGTH + " y " + MAX_PASSWORD_LENGTH + " caracteres.");
        }
        User user = new User();
        user.setEmail(UserService.normalizeEmail(admin.email()));
        user.setDisplayName(StringUtils.hasText(admin.displayName()) ? admin.displayName().trim() : "Redacción");
        user.setPasswordHash(passwordEncoder.encode(admin.password()));
        user.setRole(Role.ADMIN);
        user.setEnabled(true);
        userRepository.save(user);
        log.info("Administrador inicial creado: {}. Elimina ya APP_BOOTSTRAP_ADMIN_PASSWORD del entorno.",
                user.getEmail());
    }
}
