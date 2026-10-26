package com.ozkaslibasar.financeproject.domain.model;

/**
 * Whether the portfolio manager produced a real verdict (decision 2026-10-26-agent-analysis-decision-status).
 * An unknown status is expressed by a null {@code DecisionStatus} on the result, never by OK.
 */
public record DecisionStatus(WatchlistResearchStatus status, String reason) {

    public boolean isFailed() {
        return status == WatchlistResearchStatus.FAILED;
    }

    public boolean isOk() {
        return status == WatchlistResearchStatus.OK;
    }
}
