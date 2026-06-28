package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

/**
 * Outbound payload shape mirrored by the FastAPI agent-analysis endpoint.
 */
@Schema(description = "Metrics-only agent analysis request sent to the FastAPI data-service")
public record AgentAnalysisRequestDto(
        @Schema(description = "Ticker symbol", example = "AAPL") String ticker,
        @Schema(description = "Latest price used for the analysis", example = "193.42") double price,
        @Schema(description = "Pre-calculated metric groups keyed by fundamentals, valuation, risk, and technical") Map<String, Map<String, Double>> metrics,
        @Schema(description = "Provider-backed or neutral sentiment snapshot") Map<String, Object> sentiment
) {
}