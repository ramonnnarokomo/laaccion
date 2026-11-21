package com.laaccion.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.laaccion.support.IntegrationTestBase;
import com.laaccion.user.Role;
import com.laaccion.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@TestPropertySource(properties = "app.ai.api-key=clave-de-prueba")
class AiAssistFlowTest extends IntegrationTestBase {

    @MockitoBean
    private AiClient aiClient;

    private User editor;

    @BeforeEach
    void setUpEditor() {
        editor = createUser("editor@laaccion.test", Role.EDITOR);
    }

    private MockHttpServletRequestBuilder assist(String json) {
        return post("/api/v1/admin/ai/assist").with(loggedAs(editor)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json);
    }

    @Test
    void conClaveElAsistenteEstaActivo() throws Exception {
        mvc.perform(get("/api/v1/admin/ai/status").with(loggedAs(editor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));
    }

    @Test
    void laRevisionDevuelveSugerenciasYMandaElTextoDelimitado() throws Exception {
        given(aiClient.complete(anyString(), anyString(), anyInt())).willReturn("- «Hola»: falta contexto.");

        mvc.perform(assist("{\"field\":\"BODY\",\"mode\":\"REVIEW\",\"text\":\"<p>Hola</p>\",\"title\":\"Titular\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.format").value("text"))
                .andExpect(jsonPath("$.result").value("- «Hola»: falta contexto."));

        verify(aiClient).complete(eq(AiAssistService.SYSTEM),
                argThat(p -> p.contains("<texto>\n<p>Hola</p>\n</texto>") && p.contains("Titular del artículo: Titular")),
                eq(2500));
    }

    @Test
    void elCuerpoReescritoSeLimpiaAntesDeDevolverlo() throws Exception {
        given(aiClient.complete(anyString(), anyString(), anyInt()))
                .willReturn("```html\n<p onclick=\"x()\">Mejor</p><script>alert(1)</script>\n```");

        String result = mvc.perform(assist("{\"field\":\"BODY\",\"mode\":\"REWRITE\",\"text\":\"<p>Peor</p>\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.format").value("html"))
                .andReturn().getResponse().getContentAsString();
        assertThat(result).contains("Mejor").doesNotContain("script").doesNotContain("onclick");
    }

    @Test
    void elResumenReescritoSaleSinComillas() throws Exception {
        given(aiClient.complete(anyString(), anyString(), anyInt())).willReturn("«Un resumen mejor.»");

        mvc.perform(assist("{\"field\":\"SUMMARY\",\"mode\":\"REWRITE\",\"text\":\"Un resumen.\",\"context\":\"<p>Cuerpo</p>\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("Un resumen mejor."));
    }

    @Test
    void unTextoVacioNoLlegaALaIa() throws Exception {
        mvc.perform(assist("{\"field\":\"BODY\",\"mode\":\"REVIEW\",\"text\":\"<p> </p>\"}"))
                .andExpect(status().isBadRequest());
        verify(aiClient, never()).complete(anyString(), anyString(), anyInt());
    }

    @Test
    void sinSesionNoSePuedeUsar() throws Exception {
        mvc.perform(post("/api/v1/admin/ai/assist").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"field\":\"BODY\",\"mode\":\"REVIEW\",\"text\":\"<p>Hola</p>\"}"))
                .andExpect(status().isUnauthorized());
    }
}
