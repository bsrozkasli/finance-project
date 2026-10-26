package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ozkaslibasar.financeproject.domain.model.AgentMetricSnapshot;
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

/**
 * Proves that the data-service consumer adapters tolerate the additive C0a availability
 * fields (the composite adapter now also consumes them; see DataServiceCompositeAvailabilityTest) and return populated domain results (spec §5 P1.1 C0a,
 * spec §9 "existing suites run unchanged").
 *
 * RestTemplate's default MappingJackson2HttpMessageConverter uses Jackson with
 * FAIL_ON_UNKNOWN_PROPERTIES=false, so unknown fields are dropped without error.
 */
class DataServiceC0aCompatibilityTest {

    @Test
    void agentAnalysisIgnoresDecisionAvailability() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        DataServiceAgentAnalysisAdapter adapter = new DataServiceAgentAnalysisAdapter(restTemplate, new SimpleMeterRegistry());
        ReflectionTestUtils.setField(adapter, "baseUrl", "http://data-service.test");

        server.expect(requestTo("http://data-service.test/api/v1/agent-analysis"))
                .andRespond(withSuccess("""
                        {
                          "decision": "SELL",
                          "confidence": 70,
                          "fundamental_summary": "Weak fundamentals.",
                          "technical_summary": "Bearish.",
                          "risk_summary": "High risk.",
                          "bull_case": "Recovery possible.",
                          "bear_case": "Downtrend.",
                          "portfolio_manager_reasoning": "Reduce position.",
                          "token_usage": 200,
                          "decision_availability": {
                            "status": "unparseable",
                            "unavailable_reason": "pm_response_not_json_keyword_fallback"
                          }
                        }
                        """, APPLICATION_JSON));

        AgentMetricSnapshot metrics = new AgentMetricSnapshot(
                BigDecimal.valueOf(150),
                Map.of(), Map.of(), Map.of(), Map.of(), Map.of()
        );
        Optional<com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult> result =
                adapter.runAnalysis("AAPL", metrics, null);

        assertThat(result).isPresent();
        assertThat(result.get().decision()).isEqualTo("SELL");
        assertThat(result.get().confidence()).isEqualTo(70);
        server.verify();
    }

    @Test
    void compositeStillMapsScoresWhenBreakdownAvailabilityIsPresent() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        DataServiceResearchAdapter adapter = new DataServiceResearchAdapter(restTemplate);
        ReflectionTestUtils.setField(adapter, "baseUrl", "http://data-service.test");

        server.expect(requestTo("http://data-service.test/api/v1/research/composite/AAPL"))
                .andRespond(withSuccess("""
                        {
                          "symbol": "AAPL",
                          "overall_score": 51,
                          "grade": "C",
                          "recommendation": "Reduce",
                          "breakdown": {
                            "fundamental_score": 50,
                            "valuation_score": 50,
                            "quality_score": 50,
                            "growth_score": 50,
                            "momentum_score": 50,
                            "risk_score": 50,
                            "earnings_score": 50,
                            "sentiment_score": 70
                          },
                          "confidence": 0.5,
                          "calculated_at": "2026-10-15T10:00:00Z",
                          "breakdown_availability": {
                            "quality_score": {
                              "status": "unavailable",
                              "unavailable_reason": "factor_score_not_mapped"
                            }
                          },
                          "unavailable_components": ["risk"]
                        }
                        """, APPLICATION_JSON));

        Optional<com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort.CompositeScore> result =
                adapter.fetchCompositeScore("AAPL");

        assertThat(result).isPresent();
        assertThat(result.get().overallScore()).isEqualTo(51);
        assertThat(result.get().recommendation()).isEqualTo("Reduce");
        server.verify();
    }

    @Test
    void compositeWithoutEnoughEvidenceKeepsUnknownValuesNull() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        DataServiceResearchAdapter adapter = new DataServiceResearchAdapter(restTemplate);
        ReflectionTestUtils.setField(adapter, "baseUrl", "http://data-service.test");

        server.expect(requestTo("http://data-service.test/api/v1/research/composite/AAPL"))
                .andRespond(withSuccess("""
                        {
                          "symbol": "AAPL",
                          "overall_score": null,
                          "grade": null,
                          "recommendation": null,
                          "breakdown": {
                            "fundamental_score": null,
                            "valuation_score": null,
                            "quality_score": null,
                            "growth_score": null,
                            "momentum_score": null,
                            "risk_score": null,
                            "earnings_score": null,
                            "sentiment_score": 70
                          },
                          "confidence": 0.17,
                          "calculated_at": "2026-10-23T10:00:00Z",
                          "breakdown_availability": {},
                          "unavailable_components": ["fundamental", "valuation", "factor", "risk", "earnings"]
                        }
                        """, APPLICATION_JSON));

        var result = adapter.fetchCompositeScore("AAPL");

        assertThat(result).isPresent();
        assertThat(result.get().overallScore()).isNull();
        assertThat(result.get().grade()).isNull();
        assertThat(result.get().recommendation()).isNull();
        assertThat(result.get().breakdown().valuationScore()).isNull();
        assertThat(result.get().breakdown().sentimentScore()).isEqualTo(70);
        server.verify();
    }

    @Test
    void sentimentIgnoresAvailability() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        LlmInsightAdapter adapter = new LlmInsightAdapter(restTemplate, new ObjectMapper());
        ReflectionTestUtils.setField(adapter, "baseUrl", "http://data-service.test");

        server.expect(requestTo("http://data-service.test/api/v1/sentiment/AAPL"))
                .andRespond(withSuccess("""
                        {
                          "symbol": "AAPL",
                          "score": 0.0,
                          "label": "NEUTRAL",
                          "article_count": 0,
                          "articles_analyzed": [],
                          "calculated_at": "2026-10-15T10:00:00Z",
                          "availability": {
                            "status": "insufficient",
                            "unavailable_reason": "no_articles_in_lookback"
                          }
                        }
                        """, APPLICATION_JSON));

        Optional<com.ozkaslibasar.financeproject.domain.port.outbound.LlmInsightPort.SentimentResult> result =
                adapter.getSentiment("AAPL");

        assertThat(result).isPresent();
        assertThat(result.get().score()).isEqualTo(0.0);
        server.verify();
    }

    @Test
    void fullAnalysisIgnoresNestedSentimentAvailability() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        LlmInsightAdapter adapter = new LlmInsightAdapter(restTemplate, new ObjectMapper());
        ReflectionTestUtils.setField(adapter, "baseUrl", "http://data-service.test");

        server.expect(requestTo("http://data-service.test/api/v1/full/AAPL"))
                .andRespond(withSuccess("""
                        {
                          "symbol": "AAPL",
                          "technical": null,
                          "sentiment": {
                            "symbol": "AAPL",
                            "score": 0.0,
                            "label": "NEUTRAL",
                            "article_count": 0,
                            "articles_analyzed": [],
                            "calculated_at": "2026-10-15T10:00:00Z",
                            "availability": {
                              "status": "insufficient",
                              "unavailable_reason": "no_articles_in_lookback"
                            }
                          },
                          "llm_insight": null,
                          "generated_at": "2026-10-15T10:00:00Z"
                        }
                        """, APPLICATION_JSON));

        Optional<com.ozkaslibasar.financeproject.domain.port.outbound.LlmInsightPort.FullAnalysisResult> result =
                adapter.getFullAnalysis("AAPL");

        assertThat(result).isPresent();
        assertThat(result.get().sentiment().label()).isEqualTo("NEUTRAL");
        server.verify();
    }
}
