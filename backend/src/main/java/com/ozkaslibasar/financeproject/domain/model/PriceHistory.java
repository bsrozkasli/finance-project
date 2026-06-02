package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Objects;

/**
 * Immutable domain model representing one OHLCV candlestick for an asset.
 */
public record PriceHistory(
        String symbol,
        BigDecimal open,
        BigDecimal high,
        BigDecimal low,
        BigDecimal close,
        BigDecimal volume,
        LocalDateTime timestamp
) {

    public PriceHistory {
        Objects.requireNonNull(symbol, "symbol must not be null");
        Objects.requireNonNull(open, "open must not be null");
        Objects.requireNonNull(high, "high must not be null");
        Objects.requireNonNull(low, "low must not be null");
        Objects.requireNonNull(close, "close must not be null");
        Objects.requireNonNull(volume, "volume must not be null");
        Objects.requireNonNull(timestamp, "timestamp must not be null");

        if (symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        if (high.compareTo(low) < 0) {
            throw new IllegalArgumentException("high must be >= low");
        }
        if (open.compareTo(BigDecimal.ZERO) < 0
                || high.compareTo(BigDecimal.ZERO) < 0
                || low.compareTo(BigDecimal.ZERO) < 0
                || close.compareTo(BigDecimal.ZERO) < 0
                || volume.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("financial values must not be negative");
        }
    }

    /**
     * Backward-compatible constructor for legacy adapter usage.
     */
    public PriceHistory(
            String assetId,
            BigDecimal open,
            BigDecimal close,
            BigDecimal high,
            BigDecimal low,
            BigDecimal volume,
            Instant timestamp
    ) {
        this(assetId, open, high, low, close, volume, LocalDateTime.ofInstant(timestamp, ZoneOffset.UTC));
    }

    /**
     * Backward-compatible alias for previous model naming.
     */
    public String assetId() {
        return symbol;
    }

    /**
     * Backward-compatible view for previous timestamp type usage.
     */
    public Instant timestampAsInstant() {
        return timestamp.toInstant(ZoneOffset.UTC);
    }
}
