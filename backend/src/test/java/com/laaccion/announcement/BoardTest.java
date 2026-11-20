package com.laaccion.announcement;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.laaccion.support.IntegrationTestBase;
import com.laaccion.user.Role;
import com.laaccion.user.User;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class BoardTest extends IntegrationTestBase {

    private void createAnnouncement(User author, String title, LocalDate eventDate, boolean visible)
            throws Exception {
        String body = """
                {
                  "section": "Seminario abierto · Filosofía",
                  "title": "%s",
                  "description": "Una conversación sobre educación y criterio propio.",
                  "details": "JUEVES · 19:00 H\\nAULA ABIERTA",
                  "url": "ejemplo.com/inscripcion",
                  "eventDate": "%s",
                  "tone": "RED",
                  "visible": %s
                }
                """.formatted(title, eventDate, visible);
        mvc.perform(post("/api/v1/admin/announcements").with(loggedAs(author)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value("https://ejemplo.com/inscripcion"))
                .andExpect(jsonPath("$.stamp").value("Más información"));
    }

    @Test
    void elTablonSeparaVigentesDeCaducadosYEscondeLosOcultos() throws Exception {
        User editor = createUser("editor@laaccion.test", Role.EDITOR);
        LocalDate today = LocalDate.now(ZoneId.of("Europe/Madrid"));

        createAnnouncement(editor, "Dentro de una semana", today.plusDays(7), true);
        createAnnouncement(editor, "Hoy mismo", today, true);
        createAnnouncement(editor, "La semana pasada", today.minusDays(7), true);
        createAnnouncement(editor, "Oculto", today.plusDays(1), false);

        mvc.perform(get("/api/v1/announcements/board"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active.length()").value(2))
                // Los vigentes, por fecha más próxima primero.
                .andExpect(jsonPath("$.active[0].title").value("Hoy mismo"))
                .andExpect(jsonPath("$.active[1].title").value("Dentro de una semana"))
                .andExpect(jsonPath("$.expired.length()").value(1))
                .andExpect(jsonPath("$.expired[0].title").value("La semana pasada"));

        mvc.perform(get("/api/v1/admin/announcements/metrics").with(loggedAs(editor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(4))
                .andExpect(jsonPath("$.active").value(2))
                .andExpect(jsonPath("$.expired").value(1))
                .andExpect(jsonPath("$.hidden").value(1));

        mvc.perform(get("/api/v1/admin/announcements").param("state", "HIDDEN").with(loggedAs(editor)))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].state").value("HIDDEN"));
    }
}
