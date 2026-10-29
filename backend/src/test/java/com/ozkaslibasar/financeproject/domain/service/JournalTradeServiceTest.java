package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.JournalTrade;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeCommand;
import com.ozkaslibasar.financeproject.domain.model.JournalTradePage;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStats;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStatus;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeType;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.PriceLookup;
import com.ozkaslibasar.financeproject.domain.model.PriceStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.JournalTradePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
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
        when(priceRefreshService.lookupFreshLatest("AAPL")).thenReturn(lookup(PriceLookup.Origin.FRESH, "AAPL", "110"));

        JournalTradePage page = service.list("default", 0, 50);

        JournalTrade trade = page.content().get(0);
        assertThat(trade.currentPrice()).isEqualByComparingTo("110");
        assertThat(trade.marketValue()).isEqualByComparingTo("220");
        assertThat(trade.pnl()).isEqualByComparingTo("40");
        assertThat(trade.returnPct()).isEqualByComparingTo("22.2222");
        assertThat(trade.priceStatus()).isEqualTo(PriceStatus.OK);
        assertThat(trade.priceAsOf()).isEqualTo(CANDLE_TIME);
    }

    @Test
    void shouldRecomputeFromStoredPriceAndMarkItStaleWhenRefreshFailed() {
        shouldRecomputeStale(PriceLookup.Origin.STORED_REFRESH_FAILED);
    }

    @Test
    void shouldRecomputeFromStoredPriceAndMarkItStaleWhenRefreshWasEmpty() {
        shouldRecomputeStale(PriceLookup.Origin.STORED_REFRESH_EMPTY);
    }

    private void shouldRecomputeStale(PriceLookup.Origin origin) {
        when(tradePort.findByUserId("default")).thenReturn(List.of(openTrade("AAPL", "2", "90", "100")));
        when(priceRefreshService.lookupFreshLatest("AAPL")).thenReturn(lookup(origin, "AAPL", "105"));

        JournalTrade trade = service.list("default", 0, 50).content().get(0);

        assertThat(trade.currentPrice()).isEqualByComparingTo("105");
        assertThat(trade.marketValue()).isEqualByComparingTo("210");
        assertThat(trade.pnl()).isEqualByComparingTo("30");
        assertThat(trade.priceStatus()).isEqualTo(PriceStatus.STALE);
        assertThat(trade.priceAsOf()).isEqualTo(CANDLE_TIME);
    }

    @Test
    void shouldKeepPersistedValuesAndMarkStaleWithUpdatedAtWhenNoPriceIsFound() {
        for (PriceLookup.Origin origin : List.of(
                PriceLookup.Origin.NONE_REFRESH_FAILED, PriceLookup.Origin.NONE_REFRESH_EMPTY)) {
            when(tradePort.findByUserId("default")).thenReturn(List.of(openTrade("AAPL", "2", "90", "100")));
            when(priceRefreshService.lookupFreshLatest("AAPL")).thenReturn(lookup(origin, "AAPL", null));

            JournalTrade trade = service.list("default", 0, 50).content().get(0);

            assertThat(trade.currentPrice()).isEqualByComparingTo("100");
            assertThat(trade.marketValue()).isEqualByComparingTo("200");
            assertThat(trade.pnl()).isEqualByComparingTo("20");
            assertThat(trade.returnPct()).isEqualByComparingTo("11.1111");
            assertThat(trade.priceStatus()).isEqualTo(PriceStatus.STALE);
            assertThat(trade.priceAsOf()).isEqualTo(UPDATED_AT.atZone(ZoneId.systemDefault()).toInstant());
        }
    }

    @Test
    void shouldReportLookupStatusAndNoTimeWhenNeitherLookupNorTradeHasAPrice() {
        assertNoPrice(PriceLookup.Origin.NONE_REFRESH_FAILED, PriceStatus.FAILED);
        assertNoPrice(PriceLookup.Origin.NONE_REFRESH_EMPTY, PriceStatus.EMPTY);
    }

    private void assertNoPrice(PriceLookup.Origin origin, PriceStatus expected) {
        when(tradePort.findByUserId("default")).thenReturn(List.of(openTradeWithoutPrice("AAPL")));
        when(priceRefreshService.lookupFreshLatest("AAPL")).thenReturn(lookup(origin, "AAPL", null));

        JournalTrade trade = service.list("default", 0, 50).content().get(0);

        assertThat(trade.currentPrice()).isNull();
        assertThat(trade.pnl()).isNull();
        assertThat(trade.priceStatus()).isEqualTo(expected);
        assertThat(trade.priceAsOf()).isNull();
    }

    @Test
    void shouldLeaveClosedTradesWithoutPriceProvenance() {
        when(tradePort.findByUserId("default")).thenReturn(List.of(closedTrade("MSFT", "1", "200", "225")));

        JournalTrade trade = service.list("default", 0, 50).content().get(0);

        assertThat(trade.priceStatus()).isNull();
        assertThat(trade.priceAsOf()).isNull();
        assertThat(trade.currentPrice()).isEqualByComparingTo("225");
    }

    @Test
    void shouldFetchLatestPriceOncePerOpenTradeSymbol() {
        when(tradePort.findByUserId("default")).thenReturn(List.of(
                openTrade("AAPL", "2", "90", "100"),
                openTrade("AAPL", "1", "95", "100")));
        when(priceRefreshService.lookupFreshLatest("AAPL")).thenReturn(lookup(PriceLookup.Origin.FRESH, "AAPL", "110"));

        JournalTradePage page = service.list("default", 0, 50);

        assertThat(page.content()).hasSize(2);
        verify(priceRefreshService, times(1)).lookupFreshLatest("AAPL");
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
    void shouldLeaveReturnStatsUnknownWhenClosedTradesHaveNoCurrentPrice() {
        when(tradePort.findByUserId("default")).thenReturn(List.of(unknownClosedTrade("MSFT")));

        JournalTradeStats stats = service.stats("default");

        assertThat(stats.totalTrades()).isEqualTo(1);
        assertThat(stats.closedTrades()).isEqualTo(1);
        assertThat(stats.winRate()).isNull();
        assertThat(stats.avgReturn()).isNull();
        assertThat(stats.bestTrade()).isNull();
        assertThat(stats.worstTrade()).isNull();
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
    void shouldPreserveUnknownPriceForClosedTradeWhenCurrentPriceIsMissing() {
        when(tradePort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        JournalTrade saved = service.add(command(
                "MSFT",
                "3",
                "200",
                null,
                "0",
                LocalDate.now(),
                JournalTradeStatus.CLOSED));

        assertThat(saved.currentPrice()).isNull();
        assertThat(saved.marketValue()).isNull();
        assertThat(saved.pnl()).isNull();
        assertThat(saved.returnPct()).isNull();
        verify(priceRefreshService, never()).getFreshLatest("MSFT");
    }

    @Test
    void shouldPreserveUnknownPriceForOpenTradeWhenRefreshIsUnavailable() {
        when(priceRefreshService.getFreshLatest("AAPL")).thenReturn(Optional.empty());
        when(tradePort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        JournalTrade saved = service.add(command("AAPL", "2", "90", null, "4", null, JournalTradeStatus.OPEN));

        assertThat(saved.currentPrice()).isNull();
        assertThat(saved.marketValue()).isNull();
        assertThat(saved.pnl()).isNull();
        assertThat(saved.returnPct()).isNull();
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

    private JournalTrade unknownClosedTrade(String symbol) {
        return new JournalTrade(
                1L,
                "default",
                symbol,
                symbol,
                JournalTradeType.BUY,
                BigDecimal.ONE,
                BigDecimal.valueOf(100),
                null,
                null,
                BigDecimal.ZERO,
                "Momentum",
                "",
                List.of(),
                LocalDate.now().minusDays(10),
                LocalDate.now(),
                JournalTradeStatus.CLOSED,
                null,
                null,
                null,
                null,
                null,
                null,
                null);
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
                UPDATED_AT);
    }

    private static final Instant CANDLE_TIME = Instant.parse("2026-10-20T20:00:00Z");
    private static final LocalDateTime UPDATED_AT = LocalDateTime.of(2026, 10, 21, 9, 30);

    private PriceLookup lookup(PriceLookup.Origin origin, String symbol, String close) {
        return new PriceLookup(close == null ? Optional.empty() : Optional.of(price(symbol, close)), origin);
    }

    private JournalTrade openTradeWithoutPrice(String symbol) {
        return new JournalTrade(1L, "default", symbol, symbol, JournalTradeType.BUY, BigDecimal.ONE,
                BigDecimal.valueOf(100), null, null, BigDecimal.ZERO, "Momentum", "", List.of(),
                LocalDate.now().minusDays(10), null, JournalTradeStatus.OPEN, null, null, null, null, null,
                null, UPDATED_AT);
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
                CANDLE_TIME);
    }
}
