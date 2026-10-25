package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import com.ozkaslibasar.financeproject.domain.model.PortfolioState;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Response of the Portfolio State routes (decision D-3). Absent values are JSON {@code null}, never zero;
 * {@code assetTypeWeights} is an object with keys in sorted order and is empty unless exposures are complete.
 */
public record PortfolioStateResponse(
        String version,
        Long portfolioId,
        LocalDate asOf,
        String exposureStatus,
        List<Long> sourceEventIds,
        List<Position> positions,
        Map<String, BigDecimal> assetTypeWeights
) {
    public record Position(
            String symbol,
            String assetType,
            BigDecimal quantity,
            BigDecimal averageCost,
            BigDecimal costBasis,
            BigDecimal realizedPnl,
            String currency,
            String valuationStatus,
            BigDecimal price,
            LocalDate priceDate,
            BigDecimal marketValue,
            BigDecimal weight
    ) {
    }

    public static PortfolioStateResponse from(PortfolioState state) {
        return new PortfolioStateResponse(
                state.version(),
                state.portfolioId(),
                state.asOf(),
                state.exposureStatus().name(),
                state.sourceEventIds(),
                state.positions().stream()
                        .map(p -> new Position(p.symbol(),
                                p.assetType() == null ? null : p.assetType().name(),
                                p.quantity(), p.averageCost(), p.costBasis(), p.realizedPnl(), p.currency(),
                                p.valuationStatus().name(), p.price(), p.priceDate(), p.marketValue(), p.weight()))
                        .toList(),
                new TreeMap<>(state.assetTypeWeights()));
    }
}
