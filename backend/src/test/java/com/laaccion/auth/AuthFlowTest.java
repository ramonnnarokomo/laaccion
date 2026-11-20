package com.laaccion.auth;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.laaccion.support.IntegrationTestBase;
import com.laaccion.user.Role;
import com.laaccion.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class AuthFlowTest extends IntegrationTestBase {

    private MockHttpServletRequestBuilder login(String email, String password) {
        return post("/api/v1/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}");
    }

    @Test
    void elLoginCorrectoAbreSesionYElLogoutLaCierra() throws Exception {
        createUser("admin@laaccion.test", Role.ADMIN);

        MvcResult result = mvc.perform(login("Admin@LaAccion.test", PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@laaccion.test"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);

        mvc.perform(get("/api/v1/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@laaccion.test"));

        mvc.perform(post("/api/v1/auth/logout").session(session).with(csrf()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void sinSesionNoSeEntraAlPanel() throws Exception {
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/articles")).andExpect(status().isUnauthorized());
    }

    @Test
    void lasCredencialesMalasDanSiempreElMismo401() throws Exception {
        createUser("editor@laaccion.test", Role.EDITOR);

        mvc.perform(login("editor@laaccion.test", "contrasena-equivocada"))
                .andExpect(status().isUnauthorized());
        mvc.perform(login("no-existe@laaccion.test", "contrasena-equivocada"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void laCuentaSeBloqueaTrasVariosIntentosFallidos() throws Exception {
        createUser("editor@laaccion.test", Role.EDITOR);

        // En el perfil de test el máximo son 3 intentos.
        for (int i = 0; i < 3; i++) {
            mvc.perform(login("editor@laaccion.test", "contrasena-equivocada"))
                    .andExpect(status().isUnauthorized());
        }

        // Ya bloqueada: ni con la contraseña buena.
        mvc.perform(login("editor@laaccion.test", PASSWORD)).andExpect(status().isUnauthorized());
    }

    @Test
    void sinTokenCsrfSeRechazaCualquierEscritura() throws Exception {
        createUser("admin@laaccion.test", Role.ADMIN);

        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@laaccion.test\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void alDesactivarUnUsuarioSuSesionDejaDeValerEnLaSiguientePeticion() throws Exception {
        User editor = createUser("editor@laaccion.test", Role.EDITOR);

        mvc.perform(get("/api/v1/admin/articles").with(loggedAs(editor))).andExpect(status().isOk());

        User stored = userRepository.findById(editor.getId()).orElseThrow();
        stored.setEnabled(false);
        userRepository.save(stored);

        mvc.perform(get("/api/v1/admin/articles").with(loggedAs(editor))).andExpect(status().isUnauthorized());
    }

    @Test
    void unEditorNoPuedeGestionarUsuariosNiVerLaAuditoria() throws Exception {
        User editor = createUser("editor@laaccion.test", Role.EDITOR);
        User admin = createUser("admin@laaccion.test", Role.ADMIN);

        mvc.perform(get("/api/v1/admin/users").with(loggedAs(editor))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/audit").with(loggedAs(editor))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/users").with(loggedAs(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void lasRespuestasLlevanCabecerasDeSeguridadYSoloSeExponeHealth() throws Exception {
        mvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().exists("Referrer-Policy"));

        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
    }
}
