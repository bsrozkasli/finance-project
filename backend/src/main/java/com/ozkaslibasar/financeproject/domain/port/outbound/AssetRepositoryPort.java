package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.Asset;

import java.util.List;
import java.util.Optional;

/**
 * Outbound port — contract for persisting and retrieving {@link Asset} entities.
 */
public interface AssetRepositoryPort {

    Asset save(Asset asset);

    Optional<Asset> findBySymbol(String symbol);

    /**
     * Kept for backward compatibility with existing use cases.
     */
    List<Asset> findAll();
}
