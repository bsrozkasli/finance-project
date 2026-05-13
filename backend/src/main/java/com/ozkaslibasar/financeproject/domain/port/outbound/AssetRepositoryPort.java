package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.Asset;

import java.util.List;
import java.util.Optional;

/**
 * Outbound port — contract for persisting and retrieving {@link Asset} entities.
 *
 * <p>Implementations live in the {@code adapter/outbound/persistence} layer.
 * The domain layer depends only on this interface, never on JPA or any ORM.</p>
 */
public interface AssetRepositoryPort {

    /**
     * Finds an asset by its unique ticker symbol.
     *
     * @param symbol the ticker symbol to search for (e.g. {@code "AAPL"})
     * @return an {@link Optional} containing the asset, or empty if not found
     */
    Optional<Asset> findBySymbol(String symbol);

    /**
     * Returns all assets currently registered in the system.
     *
     * @return an unmodifiable list of assets; never {@code null}
     */
    List<Asset> findAll();

    /**
     * Persists a new asset or updates an existing one (upsert by symbol).
     *
     * @param asset the asset to save
     * @return the saved asset (may differ from input if defaults were applied)
     */
    Asset save(Asset asset);
}
