package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.port.outbound.LlmInsightPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PatternDetectionPort;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AnalysisController.class)
class AnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PatternDetectionPort patternDetectionPort;

    @MockitoBean
    private LlmInsightPort llmInsightPort;

    @Test
    void shouldReturnPatternDetectionResult() throws Exception {
        when(patternDetectionPort.detectPatterns("AAPL", "1d", "3mo", false))
                .thenReturn(Optional.of(new PatternDetectionPort.PatternDetectionResult(
                        "AAPL",
                        "1d",
                        List.of(new PatternDetectionPort.DetectedPattern(
                                "DOUBLE_BOTTOM",
                                "BULLISH",
                                0.82,
                                10,
                                20,
                                "Double bottom detected",
                                210.0)),
                        null,
                        null,
                        123L)));

        mockMvc.perform(get("/api/v1/analysis/patterns/AAPL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol", is("AAPL")))
                .andExpect(jsonPath("$.patterns[0].patternType", is("DOUBLE_BOTTOM")))
                .andExpect(jsonPath("$.patterns[0].direction", is("BULLISH")));
    }

    @Test
    void shouldReturn503WhenPatternDetectionUnavailable() throws Exception {
        when(patternDetectionPort.detectPatterns("AAPL", "1d", "3mo", false))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/analysis/patterns/AAPL"))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void shouldReturnDecisionSupportResult() throws Exception {
        when(llmInsightPort.generateDecisionSupport(any()))
                .thenReturn(Optional.of(new LlmInsightPort.DecisionSupportResult(
                        "AAPL",
                        "Hold near support",
                        "HOLD",
                        61,
                        List.of("Momentum improving"),
                        List.of("Resistance overhead"),
                        Map.of("support", 180.0, "resistance", 200.0),
                        "Balanced",
                        "1-2 weeks",
                        List.of("Watch volume"),
                        "Full analysis",
                        456L)));

        mockMvc.perform(post("/api/v1/analysis/decision-support")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"symbol\":\"AAPL\",\"userScenario\":\"Short-term outlook?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol", is("AAPL")))
                .andExpect(jsonPath("$.primarySignal", is("HOLD")))
                .andExpect(jsonPath("$.criticalLevels.support", is(180.0)));
    }
}
