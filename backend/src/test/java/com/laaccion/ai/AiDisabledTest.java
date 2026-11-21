package com.laaccion.ai;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.laaccion.support.IntegrationTestBase;
import com.laaccion.user.Role;
import com.laaccion.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Sin APP_AI_API_KEY el asistente está apagado y el panel no muestra el lápiz. */
class AiDisabledTest extends IntegrationTestBase {

    @Test
    void sinClaveElAsistenteEstaApagado() throws Exception {
        User editor = createUser("editor@laaccion.test", Role.EDITOR);
        mvc.perform(get("/api/v1/admin/ai/status").with(loggedAs(editor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
        mvc.perform(post("/api/v1/admin/ai/assist").with(loggedAs(editor)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"field\":\"BODY\",\"mode\":\"REVIEW\",\"text\":\"<p>Hola</p>\"}"))
                .andExpect(status().isServiceUnavailable());
    }
}
