package com.ozkaslibasar.financeproject.domain.model;

/**
 * Aggregated sentiment signals (Finnhub-backed), compressed for LLM input.
 */
public record AgentSentimentSnapshot(
        Double newsScore,
        String newsLabel,
        Double analystScore,
        String analystConsensus,
        Integer sentimentScore
) {
    public AgentSentimentSnapshot {
        if (sentimentScore != null && (sentimentScore < 0 || sentimentScore > 100)) {
            throw new IllegalArgumentException("sentimentScore must be between 0 and 100");
        }
    }
}
