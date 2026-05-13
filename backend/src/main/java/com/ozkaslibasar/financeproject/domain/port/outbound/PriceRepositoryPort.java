package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Outbound port — contract for persisting and retrieving {@link PriceHistory} records.
 *
 * <p>Implementations live in the {@code adapter/outbound/persistence} layer.
 * The domain never references JPA, Hibernate, or any persistence framework directly.</p>
 */
public interface PriceRepositoryPort {

    /**
     * Retrieves historical price records for a given asset within a time range.
     *
     * @param assetId the ticker symbol of the asset (e.g. {@code "AAPL"})
     * @param from    the inclusive start of the query period (UTC)
     * @param to      the inclusive end of the query period (UTC)
     * @return a list of price records ordered by timestamp ascending; never {@code null}
     */
    List<PriceHistory> findByAssetIdAndPeriod(String assetId, Instant from, Instant to);

    /**
     * Returns the most recent price record for the given asset.
     *
     * @param assetId the ticker symbol of the asset
     * @return an {@link Optional} with the latest record, or empty if none exists
     */
    Optional<PriceHistory> findLatestByAssetId(String assetId);

    /**
     * Bulk-saves a list of price history records.
     *
     * <p>Implementations should handle duplicate detection (e.g. upsert by
     * assetId + timestamp) to ensure idempotency of the ingestion job.</p>
     *
     * @param prices the list of records to persist; ignored if empty
     */
    void saveAll(List<PriceHistory> prices);
}
