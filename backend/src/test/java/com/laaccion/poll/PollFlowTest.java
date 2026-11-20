package com.laaccion.poll;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.laaccion.support.IntegrationTestBase;
import com.laaccion.user.Role;
import com.laaccion.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class PollFlowTest extends IntegrationTestBase {

    private static final String POLL = """
            {
              "question": "¿Hay democracia formal en España?",
              "videoUrl": "https://www.youtube.com/watch?v=abc123",
              "options": ["Sí", "No", "No lo sé"]
            }
            """;

    @Autowired
    private PollService pollService;

    private User admin;

    @BeforeEach
    void users() {
        admin = createUser("admin@laaccion.test", Role.ADMIN);
    }

    private static RequestPostProcessor fromIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    private MvcResult createPoll() throws Exception {
        return mvc.perform(post("/api/v1/admin/polls").with(loggedAs(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(POLL))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();
    }

    private MockHttpServletRequestBuilder vote(Long pollId, Number optionId, String ip) {
        return post("/api/v1/polls/" + pollId + "/votes").with(csrf()).with(fromIp(ip))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"optionId\": " + optionId + "}");
    }

    @Test
    void cadaConexionVotaUnaSolaVezYElVotoNoQuedaLigadoALaOpcion() throws Exception {
        MvcResult created = createPoll();
        Long pollId = idOf(created);
        Number firstOption = JsonPath.read(created.getResponse().getContentAsString(), "$.options[0].id");
        Number secondOption = JsonPath.read(created.getResponse().getContentAsString(), "$.options[1].id");

        // Un borrador no existe de cara al público.
        mvc.perform(get("/api/v1/polls/" + pollId)).andExpect(status().isNotFound());
        mvc.perform(vote(pollId, firstOption, "203.0.113.7")).andExpect(status().isNotFound());

        mvc.perform(post("/api/v1/admin/polls/" + pollId + "/open").with(loggedAs(admin)).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"));

        mvc.perform(vote(pollId, firstOption, "203.0.113.7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalVotes").value(1))
                .andExpect(jsonPath("$.options[0].votes").value(1));

        // Misma conexión, segundo intento: rechazado y el recuento no cambia.
        mvc.perform(vote(pollId, secondOption, "203.0.113.7")).andExpect(status().isConflict());

        mvc.perform(vote(pollId, secondOption, "198.51.100.9"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalVotes").value(2))
                .andExpect(jsonPath("$.options[0].percentage").value(50.0))
                .andExpect(jsonPath("$.options[1].votes").value(1));

        // En la tabla de control no hay IP en claro ni rastro de la opción elegida.
        assertThat(jdbc.queryForObject("select count(*) from poll_vote", Long.class)).isEqualTo(2);
        assertThat(jdbc.queryForList("select voter_hash from poll_vote", String.class))
                .allSatisfy(hash -> assertThat(hash).matches("[0-9a-f]{64}"));

        // Al cerrar se borran los registros de control y ya no se puede votar.
        mvc.perform(post("/api/v1/admin/polls/" + pollId + "/close").with(loggedAs(admin)).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.totalVotes").value(2));
        assertThat(jdbc.queryForObject("select count(*) from poll_vote", Long.class)).isZero();
        mvc.perform(vote(pollId, firstOption, "192.0.2.44")).andExpect(status().isConflict());
    }

    @Test
    void alVencerLaFechaDeCierreSeCierraYSeBorranLosHashes() throws Exception {
        MvcResult created = createPoll();
        Long pollId = idOf(created);
        Number option = JsonPath.read(created.getResponse().getContentAsString(), "$.options[0].id");
        mvc.perform(post("/api/v1/admin/polls/" + pollId + "/open").with(loggedAs(admin)).with(csrf()))
                .andExpect(status().isOk());
        mvc.perform(vote(pollId, option, "203.0.113.7")).andExpect(status().isOk());

        jdbc.update("update poll set closes_at = now() - interval '1 minute' where id = ?", pollId);

        assertThat(pollService.closeExpired()).isEqualTo(1);
        assertThat(jdbc.queryForObject("select status from poll where id = ?", String.class, pollId))
                .isEqualTo("CLOSED");
        assertThat(jdbc.queryForObject("select count(*) from poll_vote", Long.class)).isZero();
        // El recuento se conserva y una segunda pasada no vuelve a tocar nada.
        assertThat(jdbc.queryForObject("select sum(votes_count) from poll_option where poll_id = ?", Long.class,
                pollId)).isEqualTo(1);
        assertThat(pollService.closeExpired()).isZero();
    }

    @Test
    void noSePuedeVotarUnaOpcionDeOtraEncuesta() throws Exception {
        Long pollId = idOf(createPoll());
        MvcResult other = createPoll();
        Number foreignOption = JsonPath.read(other.getResponse().getContentAsString(), "$.options[0].id");
        mvc.perform(post("/api/v1/admin/polls/" + pollId + "/open").with(loggedAs(admin)).with(csrf()))
                .andExpect(status().isOk());

        mvc.perform(vote(pollId, foreignOption, "203.0.113.7")).andExpect(status().isBadRequest());
    }

    @Test
    void elVideoSoloPuedeSerDeLasPlataformasPrevistas() throws Exception {
        String invalid = POLL.replace("https://www.youtube.com/watch?v=abc123", "https://malo.example/video");

        mvc.perform(post("/api/v1/admin/polls").with(loggedAs(admin)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest());
    }
}
