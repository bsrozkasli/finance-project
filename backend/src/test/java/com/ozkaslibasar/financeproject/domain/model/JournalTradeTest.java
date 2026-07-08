package com.ozkaslibasar.financeproject.domain.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** EXPECTED_SOURCE_DEFAULT: derived_from_spec */
class JournalTradeTest {

    @Test
    void should_constructJournalTrade_when_allFieldsValid() {
        JournalTrade trade = createTrade(
                "user-1",
                "AAPL",
                JournalTradeType.BUY,
                BigDecimal.TEN,
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(120),
                BigDecimal.valueOf(5),
                LocalDate.now().minusDays(10),
                null,
                JournalTradeStatus.OPEN
        );

        assertThat(trade.symbol()).isEqualTo("AAPL");
        assertThat(trade.quantity()).isEqualByComparingTo("10");
        assertThat(trade.purchasePrice()).isEqualByComparingTo("100");
        assertThat(trade.currentPrice()).isEqualByComparingTo("120");
        assertThat(trade.commission()).isEqualByComparingTo("5");
    }

    @Test
    void should_throwIllegalArgumentException_when_symbolIsBlank() {
        assertThatThrownBy(() -> createTrade(
                "user-1",
                "  ",
                JournalTradeType.BUY,
                BigDecimal.TEN,
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(120),
                BigDecimal.ZERO,
                LocalDate.now().minusDays(5),
                null,
                JournalTradeStatus.OPEN
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("symbol");
    }

    @Test
    void should_throwIllegalArgumentException_when_quantityIsZeroOrNegative() {
        assertThatThrownBy(() -> createTrade(
                "user-1",
                "AAPL",
                JournalTradeType.BUY,
                BigDecimal.ZERO,
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(120),
                BigDecimal.ZERO,
                LocalDate.now().minusDays(5),
                null,
                JournalTradeStatus.OPEN
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("quantity");

        assertThatThrownBy(() -> createTrade(
                "user-1",
                "AAPL",
                JournalTradeType.BUY,
                BigDecimal.valueOf(-1),
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(120),
                BigDecimal.ZERO,
                LocalDate.now().minusDays(5),
                null,
                JournalTradeStatus.OPEN
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("quantity");
    }

    @Test
    void should_throwIllegalArgumentException_when_purchasePriceIsZeroOrNegative() {
        assertThatThrownBy(() -> createTrade(
                "user-1",
                "AAPL",
                JournalTradeType.BUY,
                BigDecimal.TEN,
                BigDecimal.ZERO,
                BigDecimal.valueOf(120),
                BigDecimal.ZERO,
                LocalDate.now().minusDays(5),
                null,
                JournalTradeStatus.OPEN
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("purchasePrice");

        assertThatThrownBy(() -> createTrade(
                "user-1",
                "AAPL",
                JournalTradeType.BUY,
                BigDecimal.TEN,
                BigDecimal.valueOf(-1),
                BigDecimal.valueOf(120),
                BigDecimal.ZERO,
                LocalDate.now().minusDays(5),
                null,
                JournalTradeStatus.OPEN
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("purchasePrice");
    }

    @Test
    void should_defaultCurrentPriceToMurchasePrice_when_null() {
        JournalTrade trade = createTrade(
                "user-1",
                "AAPL",
                JournalTradeType.BUY,
                BigDecimal.TEN,
                BigDecimal.valueOf(100),
                null,
                BigDecimal.ZERO,
                LocalDate.now().minusDays(5),
                null,
                JournalTradeStatus.OPEN
        );

        assertThat(trade.currentPrice()).isEqualByComparingTo("100");
    }

    @Test
    void should_defaultCommissionToZero_when_null() {
        JournalTrade trade = createTrade(
                "user-1",
                "AAPL",
                JournalTradeType.BUY,
                BigDecimal.TEN,
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(120),
                null,
                LocalDate.now().minusDays(5),
                null,
                JournalTradeStatus.OPEN
        );

        assertThat(trade.commission()).isEqualByComparingTo("0");
    }

    @Test
    void should_calculateMarketValue_when_constructing() {
        JournalTrade trade = createTrade(
                "user-1",
                "AAPL",
                JournalTradeType.BUY,
                BigDecimal.TEN,
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(120),
                BigDecimal.ZERO,
                LocalDate.now().minusDays(5),
                null,
                JournalTradeStatus.OPEN
        );

        assertThat(trade.marketValue()).isEqualByComparingTo("1200");
    }

    @Test
    void should_calculatePnl_when_constructing() {
        JournalTrade trade = createTrade(
                "user-1",
                "AAPL",
                JournalTradeType.BUY,
                BigDecimal.TEN,
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(120),
                BigDecimal.valueOf(5),
                LocalDate.now().minusDays(5),
                null,
                JournalTradeStatus.OPEN
        );

        assertThat(trade.pnl()).isEqualByComparingTo("195");
    }

    @Test
    void should_calculateReturnPercentage_when_constructing() {
        JournalTrade trade = createTrade(
                "user-1",
                "AAPL",
                JournalTradeType.BUY,
                BigDecimal.TEN,
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(120),
                BigDecimal.valueOf(5),
                LocalDate.now().minusDays(5),
                null,
                JournalTradeStatus.OPEN
        );

        assertThat(trade.returnPct()).isEqualByComparingTo("19.4030");
    }

    @Test
    void should_calculateHoldingDays_when_constructing() {
        LocalDate today = LocalDate.now();
        LocalDate openedAt = today.minusDays(10);

        JournalTrade openTrade = createTrade(
                "user-1",
                "AAPL",
                JournalTradeType.BUY,
                BigDecimal.ONE,
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(101),
                BigDecimal.ZERO,
                openedAt,
                null,
                null
        );

        JournalTrade closedTrade = createTrade(
                "user-1",
                "AAPL",
                JournalTradeType.BUY,
                BigDecimal.ONE,
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(101),
                BigDecimal.ZERO,
                openedAt,
                today.minusDays(3),
                null
        );

        long expectedOpenDays = ChronoUnit.DAYS.between(openedAt, LocalDate.now());
        assertThat(openTrade.holdingDays()).isEqualTo(expectedOpenDays);
        assertThat(openTrade.status()).isEqualTo(JournalTradeStatus.OPEN);

        assertThat(closedTrade.holdingDays()).isEqualTo(7);
        assertThat(closedTrade.status()).isEqualTo(JournalTradeStatus.CLOSED);
    }

    @Test
    void should_uppercaseSymbol_when_constructing() {
        JournalTrade trade = createTrade(
                "user-1",
                "aapl",
                JournalTradeType.BUY,
                BigDecimal.ONE,
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(101),
                BigDecimal.ZERO,
                LocalDate.now().minusDays(1),
                null,
                JournalTradeStatus.OPEN
        );

        assertThat(trade.symbol()).isEqualTo("AAPL");
    }

    @Test
    void should_defaultUserIdAndTypeAndStatus_when_null() {
        JournalTrade trade = createTrade(
                null,
                "AAPL",
                null,
                BigDecimal.ONE,
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(101),
                BigDecimal.ZERO,
                LocalDate.now().minusDays(1),
                null,
                null
        );

        assertThat(trade.userId()).isEqualTo("default");
        assertThat(trade.type()).isEqualTo(JournalTradeType.BUY);
        assertThat(trade.status()).isEqualTo(JournalTradeStatus.OPEN);
    }

    private JournalTrade createTrade(
            String userId,
            String symbol,
            JournalTradeType type,
            BigDecimal quantity,
            BigDecimal purchasePrice,
            BigDecimal currentPrice,
            BigDecimal commission,
            LocalDate openedAt,
            LocalDate closedAt,
            JournalTradeStatus status
    ) {
        return new JournalTrade(
                1L,
                userId,
                symbol,
                null,
                type,
                quantity,
                purchasePrice,
                currentPrice,
                null,
                commission,
                "swing",
                "note",
                null,
                openedAt,
                closedAt,
                status,
                null,
                null,
                null,
                1L,
                1L,
                null,
                null
        );
    }
}

