package com.ozkaslibasar.financeproject.domain.model;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** EXPECTED_SOURCE_DEFAULT: derived_from_spec */
class PriceHistoryTest {

    @Test
    void should_constructPriceHistory_when_allFieldsValid() {
        LocalDateTime timestamp = LocalDateTime.parse("2026-01-10T16:00:00");

        PriceHistory history = new PriceHistory(
                "AAPL",
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(155),
                BigDecimal.valueOf(149),
                BigDecimal.valueOf(152),
                BigDecimal.valueOf(1_000_000),
                timestamp
        );

        assertThat(history.symbol()).isEqualTo("AAPL");
        assertThat(history.high()).isEqualByComparingTo("155");
        assertThat(history.low()).isEqualByComparingTo("149");
        assertThat(history.timestamp()).isEqualTo(timestamp);
    }

    @ParameterizedTest
    @ValueSource(strings = {"symbol", "open", "high", "low", "close", "volume", "timestamp"})
    void should_throwNullPointerException_when_requiredFieldIsNull(String field) {
        String expectedField = field;

        assertThatThrownBy(() -> historyWithNullField(field))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining(expectedField);
    }

    @Test
    void should_throwIllegalArgumentException_when_symbolIsBlank() {
        assertThatThrownBy(() -> new PriceHistory(
                " ",
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(155),
                BigDecimal.valueOf(149),
                BigDecimal.valueOf(152),
                BigDecimal.valueOf(1_000_000),
                LocalDateTime.parse("2026-01-10T16:00:00")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("symbol");
    }

    @Test
    void should_throwIllegalArgumentException_when_highLowerThanLow() {
        assertThatThrownBy(() -> new PriceHistory(
                "AAPL",
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(148),
                BigDecimal.valueOf(149),
                BigDecimal.valueOf(152),
                BigDecimal.valueOf(1_000_000),
                LocalDateTime.parse("2026-01-10T16:00:00")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("high");
    }

    @ParameterizedTest
    @ValueSource(strings = {"open", "high", "low", "close", "volume"})
    void should_throwIllegalArgumentException_when_negativePrice(String field) {
        BigDecimal open = BigDecimal.valueOf(150);
        BigDecimal high = BigDecimal.valueOf(155);
        BigDecimal low = BigDecimal.valueOf(149);
        BigDecimal close = BigDecimal.valueOf(152);
        BigDecimal volume = BigDecimal.valueOf(1_000_000);

        switch (field) {
            case "open" -> open = BigDecimal.valueOf(-1);
            case "high" -> { high = BigDecimal.valueOf(-1); low = BigDecimal.valueOf(-2); }
            case "low" -> low = BigDecimal.valueOf(-1);
            case "close" -> close = BigDecimal.valueOf(-1);
            case "volume" -> volume = BigDecimal.valueOf(-1);
            default -> throw new IllegalStateException("Unexpected field: " + field);
        }

        BigDecimal finalOpen = open;
        BigDecimal finalHigh = high;
        BigDecimal finalLow = low;
        BigDecimal finalClose = close;
        BigDecimal finalVolume = volume;

        assertThatThrownBy(() -> new PriceHistory(
                "AAPL",
                finalOpen,
                finalHigh,
                finalLow,
                finalClose,
                finalVolume,
                LocalDateTime.parse("2026-01-10T16:00:00")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("negative");
    }

    @Test
    void should_constructWithLegacyInstantConstructor() {
        Instant timestamp = Instant.parse("2026-01-10T16:00:00Z");

        PriceHistory history = new PriceHistory(
                "AAPL",
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(152),
                BigDecimal.valueOf(155),
                BigDecimal.valueOf(149),
                BigDecimal.valueOf(1_000_000),
                timestamp
        );

        assertThat(history.symbol()).isEqualTo("AAPL");
        assertThat(history.open()).isEqualByComparingTo("150");
        assertThat(history.close()).isEqualByComparingTo("152");
        assertThat(history.high()).isEqualByComparingTo("155");
        assertThat(history.low()).isEqualByComparingTo("149");
        assertThat(history.timestamp()).isEqualTo(LocalDateTime.ofInstant(timestamp, ZoneOffset.UTC));
    }

    @Test
    void should_provideAssetIdAlias() {
        PriceHistory history = new PriceHistory(
                "AAPL",
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(155),
                BigDecimal.valueOf(149),
                BigDecimal.valueOf(152),
                BigDecimal.valueOf(1_000_000),
                LocalDateTime.parse("2026-01-10T16:00:00")
        );

        assertThat(history.assetId()).isEqualTo("AAPL");
    }

    @Test
    void should_convertTimestampToInstant() {
        LocalDateTime timestamp = LocalDateTime.parse("2026-01-10T16:00:00");
        PriceHistory history = new PriceHistory(
                "AAPL",
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(155),
                BigDecimal.valueOf(149),
                BigDecimal.valueOf(152),
                BigDecimal.valueOf(1_000_000),
                timestamp
        );

        assertThat(history.timestampAsInstant()).isEqualTo(Instant.parse("2026-01-10T16:00:00Z"));
    }

    private PriceHistory historyWithNullField(String field) {
        String symbol = "AAPL";
        BigDecimal open = BigDecimal.valueOf(150);
        BigDecimal high = BigDecimal.valueOf(155);
        BigDecimal low = BigDecimal.valueOf(149);
        BigDecimal close = BigDecimal.valueOf(152);
        BigDecimal volume = BigDecimal.valueOf(1_000_000);
        LocalDateTime timestamp = LocalDateTime.parse("2026-01-10T16:00:00");

        switch (field) {
            case "symbol" -> symbol = null;
            case "open" -> open = null;
            case "high" -> high = null;
            case "low" -> low = null;
            case "close" -> close = null;
            case "volume" -> volume = null;
            case "timestamp" -> timestamp = null;
            default -> throw new IllegalStateException("Unexpected field: " + field);
        }

        return new PriceHistory(symbol, open, high, low, close, volume, timestamp);
    }
}

