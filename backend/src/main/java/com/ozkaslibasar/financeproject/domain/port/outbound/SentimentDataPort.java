package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.AgentSentimentSnapshot;

import java.util.Optional;

/**
 * Outbound port for Finnhub-backed sentiment aggregation.
 */
public interface SentimentDataPort {

    Optional<AgentSentimentSnapshot> fetchSentiment(String symbol);
}
