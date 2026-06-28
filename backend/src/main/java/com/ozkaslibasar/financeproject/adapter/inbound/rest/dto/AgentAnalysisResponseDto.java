package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(description = "Agent analysis response returned to frontend clients")
public record AgentAnalysisResponseDto(
        @Schema(description = "Ticker symbol", example = "AAPL") String ticker,
        @Schema(description = "Portfolio manager decision", example = "HOLD") String decision,
        @Schema(description = "Decision confidence from 0 to 100", example = "72") int confidence,
        @Schema(description = "Fundamental analyst summary") @JsonProperty("fundamental_summary") String fundamentalSummary,
        @Schema(description = "Technical analyst summary") @JsonProperty("technical_summary") String technicalSummary,
        @Schema(description = "Risk analyst summary") @JsonProperty("risk_summary") String riskSummary,
        @Schema(description = "Bull researcher thesis") @JsonProperty("bull_case") String bullCase,
        @Schema(description = "Bear researcher thesis") @JsonProperty("bear_case") String bearCase,
        @Schema(description = "Portfolio manager final reasoning") @JsonProperty("portfolio_manager_reasoning") String portfolioManagerReasoning,
        @Schema(description = "Metrics snapshot used to produce the analysis") @JsonProperty("metrics_used") Map<String, Object> metricsUsed,
        @Schema(description = "Generation timestamp", example = "2026-06-28T10:15:00Z") @JsonProperty("generated_at") String generatedAt,
        @Schema(description = "Whether the response came from cache", example = "false") @JsonProperty("from_cache") boolean fromCache
) {
}