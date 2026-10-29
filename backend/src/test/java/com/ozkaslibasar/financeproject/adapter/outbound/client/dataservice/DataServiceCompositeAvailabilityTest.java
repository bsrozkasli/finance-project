package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort.ComponentAvailability;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort.CompositeScore;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** Boundary stub of the data-service composite response; no live provider is called. */
class DataServiceCompositeAvailabilityTest {

    private static final String BREAKDOWN = """
            "breakdown": {
              "fundamental_score": 50, "valuation_score": null, "quality_score": 50, "growth_score": 50,
              "momentum_score": 50, "risk_score": 50, "earnings_score": 50, "sentiment_score": 70
            },
            """;

    private Optional<CompositeScore> fetch(String json) {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        DataServiceResearchAdapter adapter = new DataServiceResearchAdapter(restTemplate);
        ReflectionTestUtils.setField(adapter, "baseUrl", "http://data-service.test");
        server.expect(requestTo("http://data-service.test/api/v1/research/composite/AAPL"))
                .andRespond(withSuccess(json, APPLICATION_JSON));
        Optional<CompositeScore> result = adapter.fetchCompositeScore("AAPL");
        server.verify();
        return result;
    }

    @Test
    void readsBreakdownAvailabilityAndUnavailableComponents() {
        Optional<CompositeScore> result = fetch("""
                {
                  "symbol": "AAPL", "overall_score": 51, "grade": "C", "recommendation": "Hold",
                  %s
                  "confidence": 0.5, "calculated_at": "2026-10-15T10:00:00Z",
                  "breakdown_availability": {
                    "fundamental_score": {"status": "available", "unavailable_reason": null},
                    "valuation_score": {"status": "unavailable", "unavailable_reason": "valuation_component_unavailable"},
                    "sentiment_score": {"status": "insufficient", "unavailable_reason": "no_articles_in_lookback"}
                  },
                  "unavailable_components": ["valuation"]
                }
                """.formatted(BREAKDOWN));

        assertThat(result).isPresent();
        assertThat(result.get().breakdownAvailability())
                .containsEntry("fundamental_score", new ComponentAvailability("available", null))
                .containsEntry("valuation_score", new ComponentAvailability("unavailable", "valuation_component_unavailable"))
                .containsEntry("sentiment_score", new ComponentAvailability("insufficient", "no_articles_in_lookback"));
        assertThat(result.get().unavailableComponents()).containsExactly("valuation");
        assertThat(result.get().overallScore()).isEqualTo(51);
    }

    @Test
    void olderDataServiceWithoutAvailabilityFieldsYieldsNullNotFailure() {
        Optional<CompositeScore> result = fetch("""
                {
                  "symbol": "AAPL", "overall_score": 51, "grade": "C", "recommendation": "Hold",
                  %s
                  "confidence": 0.5, "calculated_at": "2026-10-15T10:00:00Z"
                }
                """.formatted(BREAKDOWN));

        assertThat(result).isPresent();
        assertThat(result.get().breakdownAvailability()).isNull();
        assertThat(result.get().unavailableComponents()).isNull();
        assertThat(result.get().overallScore()).isEqualTo(51);
    }
}
