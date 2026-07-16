package com.ozkaslibasar.financeproject.domain.model;

import java.util.Objects;

/**
 * Immutable domain model representing a financial asset.
 *
 * <p>This is a pure Java record - it carries no framework annotations
 * and has zero dependencies outside the {@code java.*} standard library.</p>
 */
public record Asset(
        String symbol,
        String name,
        AssetType type,
        String exchange,
        String currency,
        String provider,
        String providerSymbol,
        AssetMetadataStatus metadataStatus) {

    public Asset(String symbol, String name, AssetType type) {
        this(symbol, name, type, null, null, null, symbol, AssetMetadataStatus.UNAVAILABLE);
    }

    /**
     * Compact constructor that validates required fields.
     *
     * @throws NullPointerException     if required arguments are {@code null}
     * @throws IllegalArgumentException if {@code symbol} is blank
     */
    public Asset {
        Objects.requireNonNull(symbol, "Asset symbol must not be null");
        Objects.requireNonNull(name, "Asset name must not be null");
        Objects.requireNonNull(type, "Asset type must not be null");
        Objects.requireNonNull(metadataStatus, "Asset metadata status must not be null");
        if (symbol.isBlank()) {
            throw new IllegalArgumentException("Asset symbol must not be blank");
        }
        symbol = symbol.trim().toUpperCase();
        providerSymbol = providerSymbol == null || providerSymbol.isBlank()
                ? symbol
                : providerSymbol.trim().toUpperCase();
    }
}
