package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

/**
 * Compressed metric groups sent to the AI service (no raw statements).
 */
@Schema(description = "Pre-calculated metric groups used by agent analysis")
public record AgentMetricDto(
        @Schema(description = "Fundamental metrics") Map<String, Double> fundamentals,
        @Schema(description = "Valuation metrics") Map<String, Double> valuation,
        @Schema(description = "Risk metrics") Map<String, Double> risk,
        @Schema(description = "Technical metrics") Map<String, Double> technical
) {
}