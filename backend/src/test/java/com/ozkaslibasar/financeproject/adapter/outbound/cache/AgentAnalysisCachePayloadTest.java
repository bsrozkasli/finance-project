package com.ozkaslibasar.financeproject.adapter.outbound.cache;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import com.ozkaslibasar.financeproject.domain.model.DecisionStatus;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Docker-free tests of the cache payload shape; the Testcontainers test covers real Redis. */
class AgentAnalysisCachePayloadTest {

    private StringRedisTemplate redis;
    private ValueOperations<String, String> ops;
    private AgentAnalysisCacheService service;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        service = new AgentAnalysisCacheService(redis, new ObjectMapper().registerModule(new JavaTimeModule()),
                new SimpleMeterRegistry());
    }

    private static AgentAnalysisResult ok() {
        return new AgentAnalysisResult("AAPL", "BUY", 85, new DecisionStatus(WatchlistResearchStatus.OK, null),
                "f", "t", "r", "bu", "be", "reasoning", Map.of("pe", 28.5),
                Instant.parse("2026-10-26T10:00:00Z"), false);
    }

    @Test
    void newShapeRoundTripsDecisionAndStatus() {
        service.put(ok());
        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(ops).set(eq("agent-analysis:AAPL"), json.capture(), any(Duration.class));
        when(ops.get("agent-analysis:AAPL")).thenReturn(json.getValue());

        AgentAnalysisResult read = service.get("AAPL").orElseThrow();

        assertThat(read.decision()).isEqualTo("BUY");
        assertThat(read.confidence()).isEqualTo(85);
        assertThat(read.decisionStatus()).isEqualTo(new DecisionStatus(WatchlistResearchStatus.OK, null));
        assertThat(read.fromCache()).isTrue();
    }

    @Test
    void nonOkPayloadIsRepresentableButNeverServedBack() {
        // Defensive: the facade never caches a non-OK result, and the cache refuses to serve one.
        AgentAnalysisResult failed = new AgentAnalysisResult("AAPL", null, null,
                new DecisionStatus(WatchlistResearchStatus.FAILED, "pm_response_not_json_default_hold"),
                "f", "t", "r", "bu", "be", "reasoning", Map.of(), Instant.parse("2026-10-26T10:00:00Z"), false);
        service.put(failed);
        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(ops).set(eq("agent-analysis:AAPL"), json.capture(), any(Duration.class));

        assertThat(json.getValue()).contains("\"decision_status\"").contains("pm_response_not_json_default_hold");
        when(ops.get("agent-analysis:AAPL")).thenReturn(json.getValue());
        assertThat(service.get("AAPL")).isEmpty();
    }

    @Test
    void oldShapeEntryWithoutDecisionStatusIsAMissAndIsInvalidated() {
        String oldShape = """
                {"ticker":"AAPL","decision":"HOLD","confidence":50,"fundamental_summary":"f",
                 "technical_summary":"t","risk_summary":"r","bull_case":"bu","bear_case":"be",
                 "portfolio_manager_reasoning":"x","metrics_used":{},"generated_at":"2026-10-26T10:00:00Z"}
                """;
        when(ops.get("agent-analysis:AAPL")).thenReturn(oldShape);

        Optional<AgentAnalysisResult> read = service.get("AAPL");

        assertThat(read).isEmpty();
        verify(redis).delete("agent-analysis:AAPL");
    }
}
