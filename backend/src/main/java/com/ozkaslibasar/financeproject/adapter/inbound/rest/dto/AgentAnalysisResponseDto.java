package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

public record AgentAnalysisResponseDto(
        String ticker,
        String decision,
        int confidence,
        @JsonProperty("fundamental_summary") String fundamentalSummary,
        @JsonProperty("technical_summary") String technicalSummary,
        @JsonProperty("risk_summary") String riskSummary,
        @JsonProperty("bull_case") String bullCase,
        @JsonProperty("bear_case") String bearCase,
        @JsonProperty("portfolio_manager_reasoning") String portfolioManagerReasoning,
        @JsonProperty("metrics_used") Map<String, Object> metricsUsed,
        @JsonProperty("generated_at") String generatedAt,
        @JsonProperty("from_cache") boolean fromCache
) {
}
