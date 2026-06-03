package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AgentAnalysisController.class)
class AgentAnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AgentAnalysisFacade agentAnalysisFacade;

    @Test
    void shouldReturnAnalysisWhenFound() throws Exception {
        AgentAnalysisResult result = new AgentAnalysisResult(
                "AAPL",
                "BUY",
                85,
                "Strong fundamentals",
                "Bullish signals",
                "Low risk",
                "iPhone growth",
                "Supply chain issues",
                "High confidence in overall growth",
                Map.of("pe", 28.5),
                Instant.parse("2026-06-03T12:00:00Z"),
                false
        );

        when(agentAnalysisFacade.getAnalysis("AAPL")).thenReturn(Optional.of(result));

        mockMvc.perform(get("/api/v1/agent-analysis/AAPL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticker").value("AAPL"))
                .andExpect(jsonPath("$.decision").value("BUY"))
                .andExpect(jsonPath("$.confidence").value(85))
                .andExpect(jsonPath("$.fundamentalSummary").value("Strong fundamentals"))
                .andExpect(jsonPath("$.technicalSummary").value("Bullish signals"))
                .andExpect(jsonPath("$.riskSummary").value("Low risk"))
                .andExpect(jsonPath("$.bullCase").value("iPhone growth"))
                .andExpect(jsonPath("$.bearCase").value("Supply chain issues"))
                .andExpect(jsonPath("$.portfolioManagerReasoning").value("High confidence in overall growth"))
                .andExpect(jsonPath("$.metricsUsed.pe").value(28.5))
                .andExpect(jsonPath("$.generatedAt").value("2026-06-03T12:00:00Z"))
                .andExpect(jsonPath("$.fromCache").value(false));
    }

    @Test
    void shouldReturn503WhenAnalysisNotFound() throws Exception {
        when(agentAnalysisFacade.getAnalysis("UNKNOWN")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/agent-analysis/UNKNOWN"))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void shouldInvalidateCacheForTicker() throws Exception {
        doNothing().when(agentAnalysisFacade).invalidateCache("AAPL");

        mockMvc.perform(delete("/api/v1/agent-analysis/AAPL/cache"))
                .andExpect(status().isNoContent());

        verify(agentAnalysisFacade).invalidateCache("AAPL");
    }

    @Test
    void shouldInvalidateAllCache() throws Exception {
        doNothing().when(agentAnalysisFacade).invalidateAllCache();

        mockMvc.perform(delete("/api/v1/agent-analysis/cache"))
                .andExpect(status().isNoContent());

        verify(agentAnalysisFacade).invalidateAllCache();
    }
}
