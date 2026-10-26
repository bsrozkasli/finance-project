package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.DecisionStatus;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;

/**
 * Maps the data-service {@code decision_availability} of the portfolio manager to a decision status
 * (decision 2026-10-26-agent-analysis-decision-status, D-1.2). Pure and stateless.
 *
 * <p>available -> OK; unparseable, unavailable and insufficient -> FAILED (the verdict could not be
 * produced; the reason code passes through unchanged); an absent or unknown status -> null (unknown),
 * never OK.
 */
public final class DecisionStatusMapper {

    private DecisionStatusMapper() {
    }

    public static DecisionStatus fromAvailability(String dataServiceStatus, String reason) {
        if (dataServiceStatus == null) {
            return null;
        }
        return switch (dataServiceStatus) {
            case "available" -> new DecisionStatus(WatchlistResearchStatus.OK, null);
            case "unparseable", "unavailable", "insufficient" ->
                    new DecisionStatus(WatchlistResearchStatus.FAILED, reason);
            default -> null;
        };
    }
}
