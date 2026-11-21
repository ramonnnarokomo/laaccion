package com.laaccion.auth;

import com.laaccion.auth.AuthDtos.LoginRequest;
import com.laaccion.auth.AuthDtos.MeResponse;
import com.laaccion.captcha.CaptchaVerifier;
import com.laaccion.common.ClientIpResolver;
import com.laaccion.common.RateLimiter;
import com.laaccion.common.error.BadRequestException;
import com.laaccion.common.error.TooManyRequestsException;
import com.laaccion.common.error.UnauthorizedException;
import com.laaccion.config.AppProperties;
import com.laaccion.security.AppUserPrincipal;
import com.laaccion.user.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    // Mismo mensaje para usuario inexistente, contraseña mala, cuenta desactivada o bloqueada:
    // así no se puede averiguar qué correos tienen cuenta.
    private static final String LOGIN_FAILED = "Credenciales incorrectas o cuenta bloqueada temporalmente.";

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final CookieCsrfTokenRepository csrfTokenRepository;
    private final UserService userService;
    private final RateLimiter rateLimiter;
    private final CaptchaVerifier captchaVerifier;
    private final ClientIpResolver clientIpResolver;
    private final AppProperties properties;

    public AuthService(AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository, CookieCsrfTokenRepository csrfTokenRepository,
            UserService userService, RateLimiter rateLimiter, ClientIpResolver clientIpResolver,
            AppProperties properties, CaptchaVerifier captchaVerifier) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.csrfTokenRepository = csrfTokenRepository;
        this.userService = userService;
        this.rateLimiter = rateLimiter;
        this.captchaVerifier = captchaVerifier;
        this.clientIpResolver = clientIpResolver;
        this.properties = properties;
    }

    public MeResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String ip = clientIpResolver.resolve(httpRequest);
        if (!rateLimiter.tryAcquire("login:" + ip, properties.rateLimit().loginPerMinute(), Duration.ofMinutes(1))) {
            throw new TooManyRequestsException("Demasiados intentos de inicio de sesión. Espera un minuto.");
        }
        // Captcha antes de mirar la contraseña: un bot no llega a sumar intentos fallidos ni a bloquear la
        // cuenta de un editor (el bloqueo tras 5 fallos solo cuenta intentos con captcha válido).
        if (!captchaVerifier.verify(request.captchaToken(), ip)) {
            throw new BadRequestException("No se ha podido verificar que no eres un robot. Vuelve a intentarlo.");
        }

        String email = UserService.normalizeEmail(request.email());
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
        } catch (BadCredentialsException ex) {
            userService.registerFailedLogin(email);
            throw new UnauthorizedException(LOGIN_FAILED);
        } catch (AuthenticationException ex) {
            throw new UnauthorizedException(LOGIN_FAILED);
        }

        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        userService.registerSuccessfulLogin(principal.getId());

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        // Nuevo identificador de sesión al autenticarse (evita la fijación de sesión).
        if (httpRequest.getSession(false) != null) {
            httpRequest.changeSessionId();
        } else {
            httpRequest.getSession(true);
        }
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        // Y token CSRF nuevo: el front debe releer la cookie XSRF-TOKEN tras el login.
        csrfTokenRepository.saveToken(csrfTokenRepository.generateToken(httpRequest), httpRequest, httpResponse);

        return MeResponse.from(principal);
    }
}
