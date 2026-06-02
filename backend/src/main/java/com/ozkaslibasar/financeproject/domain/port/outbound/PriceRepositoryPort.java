package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

/**
 * Outbound port — contract for persisting and retrieving {@link PriceHistory} records.
 */
public interface PriceRepositoryPort {

    void saveAll(List<PriceHistory> prices);

    default List<PriceHistory> findHistoryBySymbol(String symbol) {
        return findByAssetIdAndPeriod(symbol, Instant.EPOCH, LocalDateTime.now().toInstant(ZoneOffset.UTC));
    }

    /**
     * Kept for backward compatibility with existing adapters.
     */
    List<PriceHistory> findByAssetIdAndPeriod(String assetId, Instant from, Instant to);

    /**
     * Kept for backward compatibility with existing adapters.
     */
    Optional<PriceHistory> findLatestByAssetId(String assetId);
}
