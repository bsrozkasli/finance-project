package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.FundamentalSnapshot;

import java.util.List;
import java.util.Optional;

/**
 * Outbound port for persisting and retrieving calculated fundamental metrics.
 */
public interface FundamentalSnapshotPort {

    /**
     * Persist a new snapshot. Implementations should treat this as an immutable append
     * operation to preserve historical analysis over time.
     */
    void save(FundamentalSnapshot snapshot);

    /**
     * Retrieve the complete history of fundamental snapshots for a symbol,
     * ordered by calculation time descending.
     */
    List<FundamentalSnapshot> findBySymbol(String symbol);

    /**
     * Retrieve the most recently calculated snapshot for a symbol.
     */
    Optional<FundamentalSnapshot> findLatest(String symbol);
}
