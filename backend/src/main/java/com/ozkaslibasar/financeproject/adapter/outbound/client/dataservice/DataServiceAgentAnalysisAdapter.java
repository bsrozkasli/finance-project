package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import com.ozkaslibasar.financeproject.domain.model.AgentMetricSnapshot;
import com.ozkaslibasar.financeproject.domain.model.AgentSentimentSnapshot;
import com.ozkaslibasar.financeproject.domain.port.outbound.AgentAnalysisAiPort;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Calls FastAPI {@code POST /api/v1/agent-analysis} with compressed metrics only.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataServiceAgentAnalysisAdapter implements AgentAnalysisAiPort {

    private final RestTemplate restTemplate;
    private final MeterRegistry meterRegistry;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    @Override
    public Optional<AgentAnalysisResult> runAnalysis(
            String ticker,
            AgentMetricSnapshot metrics,
            AgentSentimentSnapshot sentiment) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            AgentAnalysisRequestDto request = toRequest(ticker, metrics, sentiment);
            String url = baseUrl + "/api/v1/agent-analysis";
            AgentAnalysisResponseDto response = restTemplate.postForObject(url, request, AgentAnalysisResponseDto.class);
            if (response == null || response.getDecision() == null || response.getConfidence() == null) {
                meterRegistry.counter("agent.analysis.failure").increment();
                return Optional.empty();
            }
            meterRegistry.counter("agent.analysis.success").increment();
            if (response.getTokenUsage() != null) {
                meterRegistry.counter("agent.azure.tokens", "type", "total")
                        .increment(response.getTokenUsage());
            }
            return Optional.of(toDomain(ticker, response));
        } catch (Exception e) {
            log.error("Agent analysis call failed for {}: {}", ticker, e.getMessage());
            meterRegistry.counter("agent.analysis.failure").increment();
            return Optional.empty();
        } finally {
            sample.stop(meterRegistry.timer("agent.analysis.latency"));
        }
    }

    private AgentAnalysisRequestDto toRequest(
            String ticker,
            AgentMetricSnapshot metrics,
            AgentSentimentSnapshot sentiment) {
        AgentAnalysisRequestDto dto = new AgentAnalysisRequestDto();
        dto.setTicker(ticker);
        dto.setPrice(metrics.price().doubleValue());
        dto.setMetrics(Map.of(
                "fundamentals", toDoubleMap(metrics.fundamentals()),
                "valuation", toDoubleMap(metrics.valuation()),
                "risk", toDoubleMap(metrics.risk()),
                "technical", toDoubleMap(metrics.technical())
        ));
        dto.setMacroContext(toNullableDoubleMap(metrics.macroContext()));
        dto.setSentiment(toSentimentMap(sentiment));
        return dto;
    }


    private Map<String, Object> toSentimentMap(AgentSentimentSnapshot sentiment) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (sentiment == null) {
            return out;
        }
        out.put("news_score", sentiment.newsScore());
        out.put("news_label", sentiment.newsLabel());
        out.put("analyst_score", sentiment.analystScore());
        out.put("analyst_consensus", sentiment.analystConsensus());
        out.put("sentiment_score", sentiment.sentimentScore());
        return out;
    }
    private Map<String, Double> toDoubleMap(Map<String, BigDecimal> source) {
        Map<String, Double> out = new LinkedHashMap<>();
        source.forEach((k, v) -> out.put(k, v.doubleValue()));
        return out;
    }

    private Map<String, Object> toNullableDoubleMap(Map<String, BigDecimal> source) {
        Map<String, Object> out = new LinkedHashMap<>();
        source.forEach((k, v) -> out.put(k, v != null ? v.doubleValue() : null));
        return out;
    }

    private AgentAnalysisResult toDomain(String ticker, AgentAnalysisResponseDto response) {
        return new AgentAnalysisResult(
                ticker,
                response.getDecision(),
                response.getConfidence(),
                nullToEmpty(response.getFundamentalSummary()),
                nullToEmpty(response.getTechnicalSummary()),
                nullToEmpty(response.getRiskSummary()),
                nullToEmpty(response.getBullCase()),
                nullToEmpty(response.getBearCase()),
                nullToEmpty(response.getPortfolioManagerReasoning()),
                Map.of(),
                Instant.now(),
                false
        );
    }

    private String nullToEmpty(String value) {
        return value != null ? value : "";
    }

    @Data
    static class AgentAnalysisRequestDto {
        private String ticker;
        private double price;
        private Map<String, Map<String, Double>> metrics;
        private Map<String, Object> sentiment;
        @JsonProperty("macro_context")
        private Map<String, Object> macroContext;
    }

    @Data
    static class AgentAnalysisResponseDto {
        private String decision;
        private Integer confidence;
        @JsonProperty("fundamental_summary")
        private String fundamentalSummary;
        @JsonProperty("technical_summary")
        private String technicalSummary;
        @JsonProperty("risk_summary")
        private String riskSummary;
        @JsonProperty("bull_case")
        private String bullCase;
        @JsonProperty("bear_case")
        private String bearCase;
        @JsonProperty("portfolio_manager_reasoning")
        private String portfolioManagerReasoning;
        @JsonProperty("token_usage")
        private Integer tokenUsage;
    }
}