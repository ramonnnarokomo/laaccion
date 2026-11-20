package com.laaccion.config;

import com.laaccion.security.ActiveUserFilter;
import com.laaccion.security.RestAccessDeniedHandler;
import com.laaccion.security.RestAuthenticationEntryPoint;
import com.laaccion.user.UserRepository;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.util.matcher.AnyRequestMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Seguridad de la API: sesión con cookie HttpOnly, CSRF por cookie + cabecera (patrón SPA),
 * CORS restringido y cabeceras de seguridad. La autorización real está aquí y en los
 * {@code @PreAuthorize}; los guards de Angular son solo experiencia de usuario.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    public static final String SESSION_COOKIE = "LAACCION_SESSION";

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, AppProperties properties,
            CookieCsrfTokenRepository csrfTokenRepository, SecurityContextRepository securityContextRepository,
            CorsConfigurationSource corsConfigurationSource, UserRepository userRepository) throws Exception {
        boolean secure = properties.security().secureCookies();

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                // spa(): el front lee la cookie XSRF-TOKEN y la devuelve en la cabecera X-XSRF-TOKEN.
                .csrf(csrf -> csrf.spa().csrfTokenRepository(csrfTokenRepository))
                .securityContext(context -> context.securityContextRepository(securityContextRepository))
                .authorizeHttpRequests(auth -> auth
                        // Reenvíos internos a /error del contenedor: que no los tape un 401.
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers("/api/v1/auth/login", "/api/v1/auth/csrf").permitAll()
                        .requestMatchers("/api/v1/auth/**").authenticated()
                        .requestMatchers("/api/v1/admin/**").hasAnyRole("ADMIN", "EDITOR")
                        .requestMatchers(HttpMethod.POST, "/api/v1/polls/*/votes").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/**", "/media/**").permitAll()
                        // Solo existen si springdoc está activado (perfil dev).
                        .requestMatchers(HttpMethod.GET, "/v3/api-docs", "/v3/api-docs/**", "/swagger-ui/**",
                                "/swagger-ui.html").permitAll()
                        .anyRequest().denyAll())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(new RestAuthenticationEntryPoint())
                        .accessDeniedHandler(new RestAccessDeniedHandler()))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(logout -> logout
                        .logoutUrl("/api/v1/auth/logout")
                        .deleteCookies(SESSION_COOKIE)
                        .logoutSuccessHandler((request, response, authentication) ->
                                response.setStatus(HttpServletResponse.SC_NO_CONTENT)))
                .headers(headers -> {
                    headers.contentSecurityPolicy(csp ->
                            csp.policyDirectives(properties.security().contentSecurityPolicy()));
                    headers.frameOptions(frame -> frame.deny());
                    headers.referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN));
                    headers.permissionsPolicyHeader(permissions ->
                            permissions.policy("camera=(), microphone=(), geolocation=(), payment=()"));
                    headers.httpStrictTransportSecurity(hsts -> {
                        hsts.includeSubDomains(true).maxAgeInSeconds(31_536_000);
                        if (secure) {
                            // Detrás del proxy de Railway/Cloudflare la petición puede llegar como HTTP:
                            // en producción se envía HSTS siempre.
                            hsts.requestMatcher(AnyRequestMatcher.INSTANCE);
                        }
                    });
                })
                .addFilterBefore(new ActiveUserFilter(userRepository), AnonymousAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CookieCsrfTokenRepository csrfTokenRepository(AppProperties properties) {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookiePath("/");
        repository.setCookieCustomizer(cookie -> {
            cookie.sameSite("Lax");
            if (properties.security().secureCookies()) {
                cookie.secure(true);
            }
            if (StringUtils.hasText(properties.security().cookieDomain())) {
                cookie.domain(properties.security().cookieDomain());
            }
        });
        return repository;
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    /** BCrypt con prefijo {bcrypt}: permite migrar de algoritmo en el futuro sin invalidar contraseñas. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(AppProperties properties) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(properties.cors().allowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "Accept", "X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
