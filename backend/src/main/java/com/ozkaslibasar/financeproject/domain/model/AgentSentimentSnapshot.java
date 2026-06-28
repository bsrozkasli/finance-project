package com.ozkaslibasar.financeproject.domain.model;

import java.util.Objects;

/**
 * Aggregated sentiment signals (Finnhub-backed), compressed for LLM input.
 */
public record AgentSentimentSnapshot(
        double newsScore,
        String newsLabel,
        double analystScore,
        String analystConsensus,
        int sentimentScore
) {
    public AgentSentimentSnapshot {
        if (sentimentScore < 0 || sentimentScore > 100) {
            throw new IllegalArgumentException("sentimentScore must be between 0 and 100");
        }
        Objects.requireNonNull(newsLabel, "newsLabel");
        Objects.requireNonNull(analystConsensus, "analystConsensus");
    }
}
