package com.laaccion.auth;

import com.laaccion.auth.AuthDtos.ChangePasswordRequest;
import com.laaccion.auth.AuthDtos.LoginRequest;
import com.laaccion.auth.AuthDtos.MeResponse;
import com.laaccion.security.AppUserPrincipal;
import com.laaccion.user.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Autenticación del panel editorial.
 *
 * <p>El cierre de sesión ({@code POST /api/v1/auth/logout}) no está aquí: lo atiende el filtro de
 * logout de Spring Security configurado en {@code SecurityConfig}.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    public AuthController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    /**
     * Fuerza la emisión de la cookie XSRF-TOKEN. El front la llama una vez al arrancar, antes de
     * su primer POST, y a partir de ahí envía el valor de la cookie en la cabecera X-XSRF-TOKEN.
     */
    @GetMapping("/csrf")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void csrf(HttpServletRequest request) {
        if (request.getAttribute(CsrfToken.class.getName()) instanceof CsrfToken token) {
            token.getToken();
        }
    }

    @PostMapping("/login")
    public MeResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        return authService.login(request, httpRequest, httpResponse);
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal AppUserPrincipal me) {
        return MeResponse.from(me);
    }

    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal AppUserPrincipal me) {
        userService.changeOwnPassword(me.getId(), request.currentPassword(), request.newPassword());
    }
}
