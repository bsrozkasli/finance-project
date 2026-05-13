package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

/**
 * Immutable domain model representing one OHLCV candlestick for an asset.
 *
 * <p>All price fields use {@link BigDecimal} to guarantee exact decimal
 * arithmetic — using {@code double} or {@code float} is strictly forbidden
 * per the project's financial data integrity rules.</p>
 *
 * @param assetId   the ticker symbol this price record belongs to (e.g. {@code "AAPL"})
 * @param open      opening price of the period
 * @param close     closing price of the period
 * @param high      highest price reached during the period
 * @param low       lowest price reached during the period
 * @param volume    total traded volume during the period
 * @param timestamp the start of the candlestick period (UTC)
 */
public record PriceHistory(
        String     assetId,
        BigDecimal open,
        BigDecimal close,
        BigDecimal high,
        BigDecimal low,
        BigDecimal volume,
        Instant    timestamp
) {

    /**
     * Compact constructor validating all fields and enforcing
     * price-relationship invariants.
     *
     * @throws NullPointerException     if any argument is {@code null}
     * @throws IllegalArgumentException if {@code high < low}, or any price is negative
     */
    public PriceHistory {
        Objects.requireNonNull(assetId,   "assetId must not be null");
        Objects.requireNonNull(open,      "open must not be null");
        Objects.requireNonNull(close,     "close must not be null");
        Objects.requireNonNull(high,      "high must not be null");
        Objects.requireNonNull(low,       "low must not be null");
        Objects.requireNonNull(volume,    "volume must not be null");
        Objects.requireNonNull(timestamp, "timestamp must not be null");

        if (high.compareTo(low) < 0) {
            throw new IllegalArgumentException(
                    "high (%s) must be >= low (%s)".formatted(high, low));
        }
        if (open.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("open price must not be negative");
        }
        if (volume.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("volume must not be negative");
        }
    }
}
