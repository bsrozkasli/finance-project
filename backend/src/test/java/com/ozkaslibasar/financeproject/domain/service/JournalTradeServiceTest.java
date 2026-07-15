package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.JournalTrade;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeCommand;
import com.ozkaslibasar.financeproject.domain.model.JournalTradePage;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStats;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStatus;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeType;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.JournalTradePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JournalTradeServiceTest {

    @Mock
    private JournalTradePort tradePort;

    @Mock
    private PriceRefreshService priceRefreshService;

    private JournalTradeService service;

    @BeforeEach
    void setUp() {
        service = new JournalTradeService(tradePort, priceRefreshService);
    }

    @Test
    void shouldEnrichOpenTradesWithFreshLatestPrice() {
        when(tradePort.findByUserId("default")).thenReturn(List.of(openTrade("AAPL", "2", "90", "100")));
        when(priceRefreshService.getFreshLatest("AAPL")).thenReturn(Optional.of(price("AAPL", "110")));

        JournalTradePage page = service.list("default", 0, 50);

        JournalTrade trade = page.content().get(0);
        assertThat(trade.currentPrice()).isEqualByComparingTo("110");
        assertThat(trade.marketValue()).isEqualByComparingTo("220");
        assertThat(trade.pnl()).isEqualByComparingTo("40");
        assertThat(trade.returnPct()).isEqualByComparingTo("22.2222");
    }

    @Test
    void shouldFetchLatestPriceOncePerOpenTradeSymbol() {
        when(tradePort.findByUserId("default")).thenReturn(List.of(
                openTrade("AAPL", "2", "90", "100"),
                openTrade("AAPL", "1", "95", "100")));
        when(priceRefreshService.getFreshLatest("AAPL")).thenReturn(Optional.of(price("AAPL", "110")));

        JournalTradePage page = service.list("default", 0, 50);

        assertThat(page.content()).hasSize(2);
        verify(priceRefreshService, times(1)).getFreshLatest("AAPL");
    }

    @Test
    void shouldNotRefreshClosedTradesOnRead() {
        when(tradePort.findByUserId("default")).thenReturn(List.of(closedTrade("MSFT", "1", "200", "225")));

        JournalTradePage page = service.list("default", 0, 50);

        assertThat(page.content().get(0).currentPrice()).isEqualByComparingTo("225");
        verifyNoInteractions(priceRefreshService);
    }

    @Test
    void shouldCalculateStatsFromEnrichedTrades() {
        when(tradePort.findByUserId("default")).thenReturn(List.of(
                closedTrade("MSFT", "1", "100", "130"),
                closedTrade("TSLA", "2", "50", "40")));

        JournalTradeStats stats = service.stats("default");

        assertThat(stats.totalTrades()).isEqualTo(2);
        assertThat(stats.openTrades()).isZero();
        assertThat(stats.closedTrades()).isEqualTo(2);
        assertThat(stats.winRate()).isEqualByComparingTo("50.0000");
        assertThat(stats.avgReturn()).isEqualByComparingTo("5.0000");
        assertThat(stats.bestTrade()).isEqualTo("MSFT");
        assertThat(stats.worstTrade()).isEqualTo("TSLA");
    }

    @Test
    void shouldAddOpenTradeUsingFreshLatestPriceWhenCurrentPriceIsMissing() {
        when(priceRefreshService.getFreshLatest("AAPL")).thenReturn(Optional.of(price("AAPL", "110")));
        when(tradePort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        JournalTrade saved = service.add(command("AAPL", "2", "90", null, "4", null, JournalTradeStatus.OPEN));

        assertThat(saved.currentPrice()).isEqualByComparingTo("110");
        assertThat(saved.marketValue()).isEqualByComparingTo("220");
        assertThat(saved.pnl()).isEqualByComparingTo("36");
        assertThat(saved.returnPct()).isEqualByComparingTo("19.5652");
    }

    @Test
    void shouldUsePurchasePriceForClosedTradeWhenCurrentPriceIsMissing() {
        when(tradePort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        JournalTrade saved = service.add(command(
                "MSFT",
                "3",
                "200",
                null,
                "0",
                LocalDate.now(),
                JournalTradeStatus.CLOSED));

        assertThat(saved.currentPrice()).isEqualByComparingTo("200");
        assertThat(saved.pnl()).isEqualByComparingTo("0");
        verify(priceRefreshService, never()).getFreshLatest("MSFT");
    }

    @Test
    void shouldThrowWhenUpdatingMissingTrade() {
        when(tradePort.findByIdAndUserId(99L, "default")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(99L, command("AAPL", "1", "100", "101", "0", null, null)))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Trade not found: 99");
    }

    private JournalTradeCommand command(
            String symbol,
            String quantity,
            String purchasePrice,
            String currentPrice,
            String commission,
            LocalDate closedAt,
            JournalTradeStatus status) {
        return new JournalTradeCommand(
                "default",
                symbol,
                symbol,
                JournalTradeType.BUY,
                new BigDecimal(quantity),
                new BigDecimal(purchasePrice),
                currentPrice == null ? null : new BigDecimal(currentPrice),
                LocalDate.now().minusDays(10),
                closedAt,
                status,
                new BigDecimal(commission),
                null,
                null,
                "Momentum",
                "",
                List.of());
    }

    private JournalTrade openTrade(String symbol, String quantity, String purchasePrice, String currentPrice) {
        return trade(symbol, quantity, purchasePrice, currentPrice, null, JournalTradeStatus.OPEN);
    }

    private JournalTrade closedTrade(String symbol, String quantity, String purchasePrice, String currentPrice) {
        return trade(symbol, quantity, purchasePrice, currentPrice, LocalDate.now(), JournalTradeStatus.CLOSED);
    }

    private JournalTrade trade(
            String symbol,
            String quantity,
            String purchasePrice,
            String currentPrice,
            LocalDate closedAt,
            JournalTradeStatus status) {
        BigDecimal qty = new BigDecimal(quantity);
        BigDecimal purchase = new BigDecimal(purchasePrice);
        BigDecimal current = new BigDecimal(currentPrice);
        BigDecimal marketValue = qty.multiply(current);
        BigDecimal pnl = current.subtract(purchase).multiply(qty);
        BigDecimal returnPct = pnl.multiply(BigDecimal.valueOf(100))
                .divide(purchase.multiply(qty), 4, java.math.RoundingMode.HALF_UP);
        return new JournalTrade(
                1L,
                "default",
                symbol,
                symbol,
                JournalTradeType.BUY,
                qty,
                purchase,
                current,
                marketValue,
                BigDecimal.ZERO,
                "Momentum",
                "",
                List.of(),
                LocalDate.now().minusDays(10),
                closedAt,
                status,
                pnl,
                returnPct,
                null,
                null,
                null,
                null,
                null);
    }

    private PriceHistory price(String symbol, String close) {
        BigDecimal value = new BigDecimal(close);
        return new PriceHistory(
                symbol,
                value,
                value,
                value,
                value,
                BigDecimal.valueOf(1000),
                Instant.now());
    }
}
