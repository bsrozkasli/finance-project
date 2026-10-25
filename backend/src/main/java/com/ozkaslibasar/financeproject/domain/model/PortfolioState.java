package com.ozkaslibasar.financeproject.domain.model;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

/**
 * Portfolio State at a point in time (PRD glossary): positions derived only from accepted ledger events traded on
 * or before {@code asOf}, named by a content-addressed {@code version}. A position closed back to zero stays, so its
 * realized activity is not lost. Exposures are not modelled yet, and nothing here is a market value.
 */
public record PortfolioState(
        String version,
        Long portfolioId,
        String userId,
        LocalDate asOf,
        List<Long> sourceEventIds,
        List<PortfolioHolding> positions
) {
    public PortfolioState {
        if (version == null || version.isBlank()) {
            throw new IllegalArgumentException("version must not be blank");
        }
        Objects.requireNonNull(portfolioId, "portfolioId must not be null");
        Objects.requireNonNull(userId, "userId must not be null");
        Objects.requireNonNull(asOf, "asOf must not be null");
        sourceEventIds = List.copyOf(Objects.requireNonNull(sourceEventIds, "sourceEventIds must not be null"));
        positions = List.copyOf(Objects.requireNonNull(positions, "positions must not be null"));
    }
}
