package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;

/**
 * Immutable outcome of the multi-agent analysis pipeline.
 */
public record AgentAnalysisResult(
        String ticker,
        String decision,
        int confidence,
        String fundamentalSummary,
        String technicalSummary,
        String riskSummary,
        String bullCase,
        String bearCase,
        String portfolioManagerReasoning,
        Map<String, Object> metricsUsed,
        Instant generatedAt,
        boolean fromCache
) {
    public AgentAnalysisResult {
        Objects.requireNonNull(ticker, "ticker");
        Objects.requireNonNull(decision, "decision");
        Objects.requireNonNull(fundamentalSummary, "fundamentalSummary");
        Objects.requireNonNull(technicalSummary, "technicalSummary");
        Objects.requireNonNull(riskSummary, "riskSummary");
        Objects.requireNonNull(bullCase, "bullCase");
        Objects.requireNonNull(bearCase, "bearCase");
        Objects.requireNonNull(portfolioManagerReasoning, "portfolioManagerReasoning");
        Objects.requireNonNull(metricsUsed, "metricsUsed");
        Objects.requireNonNull(generatedAt, "generatedAt");
        if (ticker.isBlank()) {
            throw new IllegalArgumentException("ticker must not be blank");
        }
        if (confidence < 0 || confidence > 100) {
            throw new IllegalArgumentException("confidence must be between 0 and 100");
        }
    }
}
