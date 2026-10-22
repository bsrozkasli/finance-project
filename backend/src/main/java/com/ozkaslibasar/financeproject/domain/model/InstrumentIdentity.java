package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.Locale;
import java.util.Objects;

/**
 * Versioned instrument identity with provenance: what the type is, how it is known, from which source, and
 * when it was retrieved. Never created from a symbol alone.
 */
public record InstrumentIdentity(
        String symbol,
        AssetType assetType,
        ListingStatus listingStatus,
        ClassificationBasis basis,
        String source,
        Instant retrievedAt
) {
    public InstrumentIdentity {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        symbol = symbol.trim().toUpperCase(Locale.ROOT);
        Objects.requireNonNull(assetType, "assetType must not be null");
        Objects.requireNonNull(listingStatus, "listingStatus must not be null");
        Objects.requireNonNull(basis, "basis must not be null");
        if (source == null || source.isBlank()) {
            throw new IllegalArgumentException("source must not be blank");
        }
        Objects.requireNonNull(retrievedAt, "retrievedAt must not be null");
    }
}
