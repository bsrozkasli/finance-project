package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(description = "Agent analysis response returned to frontend clients")
public record AgentAnalysisResponseDto(
        @Schema(description = "Ticker symbol", example = "AAPL") String ticker,
        @Schema(description = "Portfolio manager decision; null when decision_status is FAILED (the placeholder verdict is withheld)",
                example = "HOLD", nullable = true) String decision,
        @Schema(description = "Decision confidence from 0 to 100; null when decision_status is FAILED",
                example = "72", nullable = true) Integer confidence,
        @Schema(description = "Whether the portfolio manager produced a real verdict: OK, FAILED (unparseable, unavailable or insufficient; reason is the data-service reason code), or null when unknown (older data-service). Not an investment signal.",
                nullable = true) @JsonProperty("decision_status") DecisionStatusDto decisionStatus,
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
    @Schema(description = "Decision status of the portfolio manager verdict")
    public record DecisionStatusDto(
            @Schema(description = "OK or FAILED; null when unknown", example = "FAILED", nullable = true) String status,
            @Schema(description = "Data-service reason code when not OK", example = "pm_response_not_json_default_hold",
                    nullable = true) String reason
    ) {
    }
}