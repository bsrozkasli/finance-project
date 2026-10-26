package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;

/**
 * Immutable outcome of the multi-agent analysis pipeline.
 *
 * <p>{@code decisionStatus} is null when the data-service sent no (or an unknown) availability.
 * {@code decision} and {@code confidence} are null only when the status is FAILED: the placeholder
 * verdict of an unparseable portfolio manager response is never carried (decision
 * 2026-10-26-agent-analysis-decision-status, D-1.3).
 */
public record AgentAnalysisResult(
        String ticker,
        String decision,
        Integer confidence,
        DecisionStatus decisionStatus,
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
        boolean failed = decisionStatus != null && decisionStatus.isFailed();
        if (!failed) {
            Objects.requireNonNull(decision, "decision");
            Objects.requireNonNull(confidence, "confidence");
        }
        if (confidence != null && (confidence < 0 || confidence > 100)) {
            throw new IllegalArgumentException("confidence must be between 0 and 100");
        }
    }
}
