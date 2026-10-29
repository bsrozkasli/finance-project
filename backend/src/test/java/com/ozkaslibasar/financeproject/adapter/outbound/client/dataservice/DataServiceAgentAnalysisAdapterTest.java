package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import com.ozkaslibasar.financeproject.domain.model.AgentMetricSnapshot;
import com.ozkaslibasar.financeproject.domain.model.DecisionStatus;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class DataServiceAgentAnalysisAdapterTest {

    private static final String BODY_FIELDS = """
            "decision": "SELL",
            "confidence": 70,
            "fundamental_summary": "Weak fundamentals.",
            "technical_summary": "Bearish.",
            "risk_summary": "High risk.",
            "bull_case": "Recovery possible.",
            "bear_case": "Downtrend.",
            "portfolio_manager_reasoning": "Reduce position.",
            "token_usage": 200
            """;

    private Optional<AgentAnalysisResult> run(String availabilityJson) {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        DataServiceAgentAnalysisAdapter adapter =
                new DataServiceAgentAnalysisAdapter(restTemplate, new SimpleMeterRegistry());
        ReflectionTestUtils.setField(adapter, "baseUrl", "http://data-service.test");
        String json = "{" + BODY_FIELDS + (availabilityJson == null ? "" : "," + availabilityJson) + "}";
        server.expect(requestTo("http://data-service.test/api/v1/agent-analysis"))
                .andRespond(withSuccess(json, APPLICATION_JSON));
        AgentMetricSnapshot metrics = new AgentMetricSnapshot(
                BigDecimal.valueOf(150), Map.of(), Map.of(), Map.of(), Map.of(), Map.of());
        Optional<AgentAnalysisResult> result = adapter.runAnalysis("AAPL", metrics, null);
        server.verify();
        return result;
    }

    @Test
    void availableDecisionMapsToOkAndKeepsDecision() {
        AgentAnalysisResult result = run("""
                "decision_availability": {"status": "available", "unavailable_reason": null}
                """).orElseThrow();

        assertThat(result.decisionStatus()).isEqualTo(new DecisionStatus(WatchlistResearchStatus.OK, null));
        assertThat(result.decision()).isEqualTo("SELL");
        assertThat(result.confidence()).isEqualTo(70);
    }

    @Test
    void unparseableDecisionMapsToFailedAndDropsThePlaceholder() {
        AgentAnalysisResult result = run("""
                "decision_availability": {"status": "unparseable",
                  "unavailable_reason": "pm_response_not_json_keyword_fallback"}
                """).orElseThrow();

        assertThat(result.decisionStatus()).isEqualTo(
                new DecisionStatus(WatchlistResearchStatus.FAILED, "pm_response_not_json_keyword_fallback"));
        assertThat(result.decision()).isNull();
        assertThat(result.confidence()).isNull();
        assertThat(result.portfolioManagerReasoning()).isEqualTo("Reduce position.");
    }

    @Test
    void unavailableAndInsufficientAlsoMapToFailed() {
        for (String status : new String[] {"unavailable", "insufficient"}) {
            AgentAnalysisResult result = run("\"decision_availability\": {\"status\": \"" + status
                    + "\", \"unavailable_reason\": \"some_reason\"}").orElseThrow();
            assertThat(result.decisionStatus())
                    .isEqualTo(new DecisionStatus(WatchlistResearchStatus.FAILED, "some_reason"));
            assertThat(result.decision()).isNull();
            assertThat(result.confidence()).isNull();
        }
    }

    @Test
    void omittedAvailabilityFromAnOlderDataServiceMeansUnknownAndKeepsDecisionAsReceived() {
        AgentAnalysisResult result = run(null).orElseThrow();

        assertThat(result.decisionStatus()).isNull();
        assertThat(result.decision()).isEqualTo("SELL");
        assertThat(result.confidence()).isEqualTo(70);
    }

    @Test
    void unknownStatusMeansUnknownNeverOk() {
        AgentAnalysisResult result = run("""
                "decision_availability": {"status": "brand_new", "unavailable_reason": "x"}
                """).orElseThrow();

        assertThat(result.decisionStatus()).isNull();
        assertThat(result.decision()).isEqualTo("SELL");
    }
}
