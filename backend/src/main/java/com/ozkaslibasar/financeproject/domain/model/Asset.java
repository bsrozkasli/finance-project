package com.ozkaslibasar.financeproject.domain.model;

import java.util.Objects;

/**
 * Immutable domain model representing a financial asset.
 *
 * <p>This is a pure Java record — it carries no framework annotations
 * and has zero dependencies outside the {@code java.*} standard library.</p>
 *
 * @param symbol the unique ticker symbol (e.g. {@code "AAPL"})
 * @param name   the human-readable asset name (e.g. {@code "Apple Inc."})
 * @param type   the category of this asset
 */
public record Asset(String symbol, String name, AssetType type) {

    /**
     * Compact constructor that validates required fields.
     *
     * @throws NullPointerException     if any argument is {@code null}
     * @throws IllegalArgumentException if {@code symbol} is blank
     */
    public Asset {
        Objects.requireNonNull(symbol, "Asset symbol must not be null");
        Objects.requireNonNull(name,   "Asset name must not be null");
        Objects.requireNonNull(type,   "Asset type must not be null");
        if (symbol.isBlank()) {
            throw new IllegalArgumentException("Asset symbol must not be blank");
        }
    }
}
