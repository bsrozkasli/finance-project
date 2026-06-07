package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import java.util.Map;

/**
 * Compressed metric groups sent to the AI service (no raw statements).
 */
public record AgentMetricDto(
        Map<String, Double> fundamentals,
        Map<String, Double> valuation,
        Map<String, Double> risk,
        Map<String, Double> technical
) {
}
