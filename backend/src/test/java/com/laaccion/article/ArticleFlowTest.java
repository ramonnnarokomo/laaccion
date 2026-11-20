package com.laaccion.article;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.laaccion.support.IntegrationTestBase;
import com.laaccion.user.Role;
import com.laaccion.user.User;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class ArticleFlowTest extends IntegrationTestBase {

    private static final String HTML = "<p>Texto del artículo</p><script>alert(1)</script>"
            + "<a href='javascript:alert(1)' onclick='robar()'>enlace</a>";

    private User editor;
    private User otherEditor;
    private User admin;

    @BeforeEach
    void users() {
        editor = createUser("editor@laaccion.test", Role.EDITOR);
        otherEditor = createUser("otra@laaccion.test", Role.EDITOR);
        admin = createUser("admin@laaccion.test", Role.ADMIN);
    }

    private String body(String title, String status, String publishedAt) {
        return """
                {
                  "title": "%s",
                  "summary": "Resumen del artículo",
                  "contentHtml": "%s",
                  "status": "%s",
                  "publishedAt": %s,
                  "categoryId": %d,
                  "tags": ["Democracia formal", "Educación"]
                }
                """.formatted(title, HTML, status, publishedAt == null ? "null" : "\"" + publishedAt + "\"",
                firstCategoryId());
    }

    private MvcResult create(User author, String title, String status, String publishedAt) throws Exception {
        return mvc.perform(post("/api/v1/admin/articles")
                        .with(loggedAs(author)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(title, status, publishedAt)))
                .andExpect(status().isCreated())
                .andReturn();
    }

    @Test
    void unBorradorNoSeVeYAlPublicarloApareceYaSaneado() throws Exception {
        MvcResult created = create(editor, "La educación no termina en el aula", "DRAFT", null);
        Long id = idOf(created);
        String slug = "la-educacion-no-termina-en-el-aula";

        mvc.perform(get("/api/v1/articles/" + slug)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/articles")).andExpect(jsonPath("$.totalElements").value(0));

        mvc.perform(put("/api/v1/admin/articles/" + id)
                        .with(loggedAs(editor)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("La educación no termina en el aula", "PUBLISHED", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.slug").value(slug));

        mvc.perform(get("/api/v1/articles/" + slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("La educación no termina en el aula"))
                .andExpect(jsonPath("$.contentHtml", containsString("<p>Texto del artículo</p>")))
                .andExpect(jsonPath("$.contentHtml", not(containsString("script"))))
                .andExpect(jsonPath("$.contentHtml", not(containsString("onclick"))))
                .andExpect(jsonPath("$.contentHtml", not(containsString("javascript:"))))
                .andExpect(jsonPath("$.tags.length()").value(2))
                .andExpect(jsonPath("$.author").value("Usuario EDITOR"));

        mvc.perform(get("/api/v1/articles").param("tag", "democracia-formal"))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/v1/articles").param("category", "no-existe"))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void unArticuloProgramadoNoSeVeHastaSuFecha() throws Exception {
        String future = Instant.now().plus(2, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS).toString();
        MvcResult created = create(editor, "Artículo programado", "SCHEDULED", future);

        mvc.perform(get("/api/v1/articles/articulo-programado")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/admin/articles/" + idOf(created)).with(loggedAs(editor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SCHEDULED"));
        mvc.perform(get("/api/v1/admin/articles").param("status", "SCHEDULED").with(loggedAs(editor)))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void programarSinFechaFuturaEsUnError() throws Exception {
        mvc.perform(post("/api/v1/admin/articles")
                        .with(loggedAs(editor)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Sin fecha", "SCHEDULED", null)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void dosArticulosConElMismoTitularRecibenSlugsDistintos() throws Exception {
        create(editor, "Mismo titular", "DRAFT", null);
        mvc.perform(post("/api/v1/admin/articles")
                        .with(loggedAs(editor)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Mismo titular", "DRAFT", null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("mismo-titular-2"));
    }

    @Test
    void unEditorSoloModificaSusArticulosYUnAdminCualquiera() throws Exception {
        Long id = idOf(create(editor, "Artículo ajeno", "DRAFT", null));

        mvc.perform(put("/api/v1/admin/articles/" + id)
                        .with(loggedAs(otherEditor)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Lo cambio yo", "DRAFT", null)))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/admin/articles/" + id).with(loggedAs(otherEditor)).with(csrf()))
                .andExpect(status().isForbidden());

        mvc.perform(put("/api/v1/admin/articles/" + id)
                        .with(loggedAs(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Lo cambia el admin", "DRAFT", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Lo cambia el admin"));
    }

    @Test
    void laEscrituraExigeSesionTokenCsrfYDatosValidos() throws Exception {
        String valid = body("Titular", "DRAFT", null);

        mvc.perform(post("/api/v1/admin/articles").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(valid))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/admin/articles").with(loggedAs(editor))
                        .contentType(MediaType.APPLICATION_JSON).content(valid))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/articles").with(loggedAs(editor)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body("", "DRAFT", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("title"));
    }
}
