package com.laaccion.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.laaccion.captcha.CaptchaVerifier;
import com.laaccion.support.IntegrationTestBase;
import com.laaccion.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** El login exige captcha válido antes de comprobar la contraseña. */
class LoginCaptchaTest extends IntegrationTestBase {

    @MockitoBean
    private CaptchaVerifier captchaVerifier;

    private MockHttpServletRequestBuilder login(String password, String token) {
        String captcha = token == null ? "" : ",\"captchaToken\":\"" + token + "\"";
        return post("/api/v1/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"editor@laaccion.test\",\"password\":\"" + password + "\"" + captcha + "}");
    }

    @Test
    void sinCaptchaValidoNoSeEntraNiCuentaComoIntentoFallido() throws Exception {
        createUser("editor@laaccion.test", Role.EDITOR);
        given(captchaVerifier.verify(any(), any())).willReturn(false);

        mvc.perform(login(PASSWORD, null)).andExpect(status().isBadRequest());
        mvc.perform(login("contrasena-equivocada", "token-falso")).andExpect(status().isBadRequest());

        Integer failed = jdbc.queryForObject(
                "select failed_login_attempts from app_user where email = 'editor@laaccion.test'", Integer.class);
        assertThat(failed).isZero();
    }

    @Test
    void conCaptchaValidoSeEntra() throws Exception {
        createUser("editor@laaccion.test", Role.EDITOR);
        given(captchaVerifier.verify(eq("token-bueno"), any())).willReturn(true);

        mvc.perform(login(PASSWORD, "token-bueno")).andExpect(status().isOk());
    }
}
