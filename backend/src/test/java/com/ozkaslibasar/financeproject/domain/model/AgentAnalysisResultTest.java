package com.ozkaslibasar.financeproject.domain.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AgentAnalysisResultTest {

    private static final DecisionStatus OK = new DecisionStatus(WatchlistResearchStatus.OK, null);
    private static final DecisionStatus FAILED =
            new DecisionStatus(WatchlistResearchStatus.FAILED, "pm_response_not_json_default_hold");

    private static AgentAnalysisResult build(String decision, Integer confidence, DecisionStatus status) {
        return new AgentAnalysisResult("AAPL", decision, confidence, status, "f", "t", "r", "bu", "be",
                "reasoning", Map.of(), Instant.parse("2026-10-26T10:00:00Z"), false);
    }

    @Test
    void failedStatusAllowsNullDecisionAndConfidence() {
        AgentAnalysisResult result = build(null, null, FAILED);
        assertThat(result.decision()).isNull();
        assertThat(result.confidence()).isNull();
    }

    @Test
    void okStatusRequiresDecisionAndConfidence() {
        assertThatThrownBy(() -> build(null, 50, OK)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> build("BUY", null, OK)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void unknownStatusRequiresDecisionAndConfidence() {
        assertThatThrownBy(() -> build(null, 50, null)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> build("BUY", null, null)).isInstanceOf(NullPointerException.class);
        assertThat(build("BUY", 50, null).decisionStatus()).isNull();
    }

    @Test
    void confidenceStillBoundedWhenPresent() {
        assertThatThrownBy(() -> build("BUY", 101, OK)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> build("BUY", -1, OK)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> build("BUY", 101, FAILED)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void failedStatusStillRequiresTheOtherFields() {
        assertThatThrownBy(() -> new AgentAnalysisResult("AAPL", null, null, FAILED, "f", "t", "r", "bu", "be",
                null, Map.of(), Instant.now(), false)).isInstanceOf(NullPointerException.class);
    }
}
