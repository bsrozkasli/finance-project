package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ReportController.class)
class ReportControllerTest {

    private static final String BASE_PATH = "/api/v1/reports";
    private static final String DIAGNOSTIC_PATH = BASE_PATH + "/test";
    private static final String EXPECTED_DIAGNOSTIC_MESSAGE =
            "Raporlama endpoint'i \u00E7al\u0131\u015F\u0131yor. \u0130leride Excel ve PDF raporlar\u0131 buradan servis edilecek.";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnDiagnosticReportAsPlainTextWithoutJsonWrapperAndPreserveTurkishUtf8() throws Exception {
        MvcResult result = mockMvc.perform(get(DIAGNOSTIC_PATH).accept(MediaType.TEXT_PLAIN))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andReturn();

        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(body).isNotBlank();
        assertThat(body).contains(EXPECTED_DIAGNOSTIC_MESSAGE);
        assertThat(body).contains("\u00E7al\u0131\u015F\u0131yor");
        assertThat(body).contains("\u0130leride");
        assertThat(body).contains("raporlar\u0131");
        assertThat(body).doesNotStartWith("{");
        assertThat(body).doesNotStartWith("[");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/v1/reports",
            "/api/v1/reports/test/extra",
            "/api/v1/reports/company/AAPL",
            "/api/v1/reports/smart/AAPL"
    })
    void shouldNotReturn200ForRoutesOutsideDiagnosticEndpoint(String path) throws Exception {
        MvcResult result = mockMvc.perform(get(path)).andReturn();

        assertThat(result.getResponse().getStatus()).isNotEqualTo(200);
    }

    @Test
    void shouldRejectUnsupportedMethodsForDiagnosticEndpoint() throws Exception {
        mockMvc.perform(post(DIAGNOSTIC_PATH))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(put(DIAGNOSTIC_PATH))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(delete(DIAGNOSTIC_PATH))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void shouldAcceptTextPlainAndDocumentApplicationJsonNegotiationBehavior() throws Exception {
        mockMvc.perform(get(DIAGNOSTIC_PATH).accept(MediaType.TEXT_PLAIN))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN));

        MvcResult jsonAcceptResult = mockMvc.perform(get(DIAGNOSTIC_PATH).accept(MediaType.APPLICATION_JSON))
                .andReturn();
        int jsonAcceptStatus = jsonAcceptResult.getResponse().getStatus();
        String jsonAcceptBody = jsonAcceptResult.getResponse().getContentAsString(StandardCharsets.UTF_8);
        String jsonAcceptContentType = jsonAcceptResult.getResponse().getContentType();

        assertThat(jsonAcceptStatus).isEqualTo(200);
        assertThat(jsonAcceptBody).isNotBlank();
        assertThat(jsonAcceptBody).doesNotStartWith("{");
        assertThat(jsonAcceptBody).doesNotStartWith("[");
        assertThat(jsonAcceptContentType).isNotBlank();
        MediaType negotiatedType = MediaType.parseMediaType(jsonAcceptContentType);
        assertThat(
                negotiatedType.isCompatibleWith(MediaType.TEXT_PLAIN)
                        || negotiatedType.isCompatibleWith(MediaType.APPLICATION_JSON)
        ).isTrue();
    }

    @Test
    void shouldNotLeakSensitiveDetailsInUnsupportedRouteAndMethodErrors() throws Exception {
        MvcResult unsupportedRoute = mockMvc.perform(get(BASE_PATH + "/test/extra")
                        .accept(MediaType.APPLICATION_JSON))
                .andReturn();
        MvcResult unsupportedMethod = mockMvc.perform(post(DIAGNOSTIC_PATH)
                        .accept(MediaType.APPLICATION_JSON))
                .andReturn();

        assertThat(unsupportedRoute.getResponse().getStatus()).isNotEqualTo(200);
        assertThat(unsupportedMethod.getResponse().getStatus()).isNotEqualTo(200);

        assertNoSensitiveDetails(unsupportedRoute.getResponse().getContentAsString(StandardCharsets.UTF_8));
        assertNoSensitiveDetails(unsupportedMethod.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private void assertNoSensitiveDetails(String body) {
        assertThat(body).doesNotContain("java.lang");
        assertThat(body).doesNotContain("org.springframework");
        assertThat(body).doesNotContain("Exception");
        assertThat(body).doesNotContain("SQLException");
        assertThat(body).doesNotContainIgnoringCase("select ");
        assertThat(body).doesNotContain("DB_PASSWORD");
        assertThat(body).doesNotContain("FINNHUB_API_KEY");
        assertThat(body).doesNotContain("AZURE_OPENAI");
    }
}
