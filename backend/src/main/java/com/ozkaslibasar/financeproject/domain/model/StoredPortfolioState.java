package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

/**
 * The persisted form of a Portfolio State (decision D-3): the version, the ledger event ids it was derived from
 * (voided events stay referenced) and the valuation inputs used. {@code createdAt} is null until stored.
 */
public record StoredPortfolioState(
        String version,
        Long portfolioId,
        String userId,
        LocalDate asOf,
        String baseCurrency,
        ExposureStatus exposureStatus,
        List<Long> eventIds,
        List<ValuationInput> valuationInputs,
        Instant createdAt
) {
    public StoredPortfolioState {
        if (version == null || version.isBlank()) {
            throw new IllegalArgumentException("version must not be blank");
        }
        Objects.requireNonNull(portfolioId, "portfolioId must not be null");
        Objects.requireNonNull(userId, "userId must not be null");
        Objects.requireNonNull(asOf, "asOf must not be null");
        if (baseCurrency == null || baseCurrency.isBlank()) {
            throw new IllegalArgumentException("baseCurrency must not be blank");
        }
        Objects.requireNonNull(exposureStatus, "exposureStatus must not be null");
        eventIds = List.copyOf(Objects.requireNonNull(eventIds, "eventIds must not be null"));
        valuationInputs = List.copyOf(Objects.requireNonNull(valuationInputs, "valuationInputs must not be null"));
    }
}
