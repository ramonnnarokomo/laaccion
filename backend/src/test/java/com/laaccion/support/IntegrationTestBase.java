package com.laaccion.support;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import com.jayway.jsonpath.JsonPath;
import com.laaccion.security.AppUserPrincipal;
import com.laaccion.user.Role;
import com.laaccion.user.User;
import com.laaccion.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base de los tests de integración: aplicación completa contra un PostgreSQL real (Testcontainers),
 * con las migraciones de Flyway aplicadas. Necesitan Docker en marcha.
 *
 * <p>Para lanzar solo los tests unitarios: {@code mvn test -DexcludedGroups=integration}
 */
@SpringBootTest
@ActiveProfiles("test")
@Tag("integration")
public abstract class IntegrationTestBase {

    protected static final String PASSWORD = "contrasena-de-prueba-123";

    // Un único contenedor para toda la batería: se arranca una vez y lo retira Testcontainers al acabar.
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private WebApplicationContext context;

    @Autowired
    protected JdbcTemplate jdbc;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    protected MockMvc mvc;

    @BeforeEach
    void resetState() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        // Se vacía todo menos las secciones, que vienen de la migración V2.
        jdbc.execute("truncate table article_tag, article, tag, poll_vote, poll_option, poll, announcement, "
                + "image, audit_log, app_user restart identity cascade");
    }

    protected User createUser(String email, Role role) {
        User user = new User();
        user.setEmail(email);
        user.setDisplayName("Usuario " + role);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setRole(role);
        user.setEnabled(true);
        return userRepository.save(user);
    }

    /** Hace la petición como ese usuario, con una sesión ya iniciada. */
    protected RequestPostProcessor loggedAs(User user) {
        return user(AppUserPrincipal.from(user));
    }

    protected Long firstCategoryId() {
        return jdbc.queryForObject("select min(id) from category", Long.class);
    }

    protected static Long idOf(MvcResult result) throws Exception {
        Number id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        return id.longValue();
    }
}
