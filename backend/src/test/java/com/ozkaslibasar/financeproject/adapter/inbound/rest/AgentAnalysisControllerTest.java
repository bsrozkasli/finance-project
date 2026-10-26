package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.contract.ContractFixtures;
import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import com.ozkaslibasar.financeproject.domain.model.DecisionStatus;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import org.hamcrest.Matchers;
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
                new DecisionStatus(WatchlistResearchStatus.OK, null),
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
                .andExpect(jsonPath("$.fundamental_summary").value("Strong fundamentals"))
                .andExpect(jsonPath("$.technical_summary").value("Bullish signals"))
                .andExpect(jsonPath("$.risk_summary").value("Low risk"))
                .andExpect(jsonPath("$.bull_case").value("iPhone growth"))
                .andExpect(jsonPath("$.bear_case").value("Supply chain issues"))
                .andExpect(jsonPath("$.portfolio_manager_reasoning").value("High confidence in overall growth"))
                .andExpect(jsonPath("$.metrics_used.pe").value(28.5))
                .andExpect(jsonPath("$.generated_at").value("2026-06-03T12:00:00Z"))
                .andExpect(jsonPath("$.from_cache").value(false))
                .andExpect(jsonPath("$.decision_status.status").value("OK"))
                .andExpect(jsonPath("$.decision_status.reason").value(Matchers.nullValue()));
    }

    @Test
    void shouldReturnNullDecisionAndConfidenceWithFailedStatus() throws Exception {
        AgentAnalysisResult result = new AgentAnalysisResult(
                "AAPL", null, null,
                new DecisionStatus(WatchlistResearchStatus.FAILED, "pm_response_not_json_default_hold"),
                "Strong fundamentals", "Bullish signals", "Low risk", "iPhone growth", "Supply chain issues",
                "Unstructured model text", Map.of("pe", 28.5),
                Instant.parse("2026-06-03T12:00:00Z"), false);
        when(agentAnalysisFacade.getAnalysis("AAPL")).thenReturn(Optional.of(result));

        mockMvc.perform(get("/api/v1/agent-analysis/AAPL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value(Matchers.nullValue()))
                .andExpect(jsonPath("$.confidence").value(Matchers.nullValue()))
                .andExpect(jsonPath("$.decision_status.status").value("FAILED"))
                .andExpect(jsonPath("$.decision_status.reason").value("pm_response_not_json_default_hold"))
                .andExpect(jsonPath("$.portfolio_manager_reasoning").value("Unstructured model text"))
                .andExpect(jsonPath("$.ticker").value("AAPL"))
                .andExpect(jsonPath("$.from_cache").value(false));
    }

    @Test
    void unknownStatusIsSerializedAsJsonNull() throws Exception {
        AgentAnalysisResult result = new AgentAnalysisResult(
                "AAPL", "HOLD", 50, null,
                "f", "t", "r", "bu", "be", "x", Map.of(), Instant.parse("2026-06-03T12:00:00Z"), false);
        when(agentAnalysisFacade.getAnalysis("AAPL")).thenReturn(Optional.of(result));

        mockMvc.perform(get("/api/v1/agent-analysis/AAPL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("HOLD"))
                .andExpect(jsonPath("$.decision_status").value(Matchers.nullValue()));
    }

    @Test
    void okAndFailedResponsesMatchTheSharedFixtures() throws Exception {
        AgentAnalysisResult ok = new AgentAnalysisResult(
                "AAPL", "BUY", 85, new DecisionStatus(WatchlistResearchStatus.OK, null),
                "f", "t", "r", "bu", "be", "x", Map.of("pe", 28.5), Instant.parse("2026-06-03T12:00:00Z"), false);
        when(agentAnalysisFacade.getAnalysis("AAPL")).thenReturn(Optional.of(ok));
        ContractFixtures.assertSameShape("agent-analysis.json", mockMvc.perform(get("/api/v1/agent-analysis/AAPL"))
                .andReturn().getResponse().getContentAsString());

        AgentAnalysisResult failed = new AgentAnalysisResult(
                "AAPL", null, null,
                new DecisionStatus(WatchlistResearchStatus.FAILED, "pm_response_not_json_default_hold"),
                "f", "t", "r", "bu", "be", "x", Map.of("pe", 28.5), Instant.parse("2026-06-03T12:00:00Z"), false);
        when(agentAnalysisFacade.getAnalysis("AAPL")).thenReturn(Optional.of(failed));
        ContractFixtures.assertSameShape("agent-analysis-failed.json",
                mockMvc.perform(get("/api/v1/agent-analysis/AAPL")).andReturn().getResponse().getContentAsString());
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
