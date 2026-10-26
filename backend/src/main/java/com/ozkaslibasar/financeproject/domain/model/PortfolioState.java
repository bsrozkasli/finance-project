package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Portfolio State at a point in time (PRD glossary): positions derived only from accepted ledger events traded on
 * or before {@code asOf}, valued only from retained prices (decision D-2), named by a content-addressed
 * {@code version}. A position closed back to zero stays, so its realized activity is not lost. Weights exist only
 * when {@code exposureStatus} is {@code COMPLETE}; {@code valuationInputs} are the price observations used.
 */
public record PortfolioState(
        String version,
        Long portfolioId,
        String userId,
        LocalDate asOf,
        String baseCurrency,
        ExposureStatus exposureStatus,
        List<Long> sourceEventIds,
        List<PortfolioStatePosition> positions,
        Map<String, BigDecimal> assetTypeWeights,
        List<ValuationInput> valuationInputs
) {
    public PortfolioState {
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
        sourceEventIds = List.copyOf(Objects.requireNonNull(sourceEventIds, "sourceEventIds must not be null"));
        positions = List.copyOf(Objects.requireNonNull(positions, "positions must not be null"));
        assetTypeWeights = Map.copyOf(Objects.requireNonNull(assetTypeWeights, "assetTypeWeights must not be null"));
        valuationInputs = List.copyOf(Objects.requireNonNull(valuationInputs, "valuationInputs must not be null"));
    }
}
