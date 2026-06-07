package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import java.util.Map;

/**
 * Outbound payload shape mirrored by the FastAPI agent-analysis endpoint.
 */
public record AgentAnalysisRequestDto(
        String ticker,
        double price,
        Map<String, Map<String, Double>> metrics,
        Map<String, Object> sentiment
) {
}
