package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.model.PortfolioPosition;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPositionPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PortfolioDashboardController.class)
class PortfolioDashboardControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private PortfolioPositionPort positionPort;

        @MockitoBean
        private PortfolioPort portfolioPort;

        @MockitoBean
        private PortfolioTransactionPort transactionPort;

        @MockitoBean
        private PortfolioLedgerService ledgerService;

        @MockitoBean
        private PriceRefreshService priceRefreshService;

        @Test
        void shouldBuildPerformanceSeriesFromFreshPriceHistory() throws Exception {
                when(positionPort.findByUserId("default")).thenReturn(List.of(position("AAPL", "2", "90")));
                when(priceRefreshService.getFreshHistory("AAPL", "1d", "1mo"))
                                .thenReturn(List.of(
                                                price("AAPL", "100", LocalDateTime.now().minusDays(2)),
                                                price("AAPL", "110", LocalDateTime.now().minusDays(1))));

                mockMvc.perform(get("/api/v1/portfolio/performance?period=1M"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.period").value("1M"))
                                .andExpect(jsonPath("$.series.length()").value(2))
                                .andExpect(jsonPath("$.series[0].portfolioValue").value(200))
                                .andExpect(jsonPath("$.series[1].portfolioValue").value(220));
        }

        @Test
        void shouldPopulateBenchmarkSeriesWhenBenchmarkIsProvided() throws Exception {
                when(positionPort.findByUserId("default")).thenReturn(List.of(position("AAPL", "2", "90")));
                LocalDateTime first = LocalDateTime.now().minusDays(2);
                LocalDateTime second = LocalDateTime.now().minusDays(1);
                when(priceRefreshService.getFreshHistory("AAPL", "1d", "1mo"))
                                .thenReturn(List.of(
                                                price("AAPL", "100", first),
                                                price("AAPL", "110", second)));
                when(priceRefreshService.getFreshHistory("SPY", "1d", "1mo"))
                                .thenReturn(List.of(
                                                price("SPY", "400", first),
                                                price("SPY", "440", second)));

                mockMvc.perform(get("/api/v1/portfolio/performance?period=1M&benchmark=SP500"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.series[0].benchmarkValue").value(200.0))
                                .andExpect(jsonPath("$.series[1].benchmarkValue").value(220.0));
        }

        @Test
        void shouldReturnEmptyPerformanceSeriesWhenNoPriceHistoryExists() throws Exception {
                when(positionPort.findByUserId("default")).thenReturn(List.of(position("AAPL", "2", "90")));
                when(priceRefreshService.getFreshHistory("AAPL", "1d", "1mo")).thenReturn(List.of());

                mockMvc.perform(get("/api/v1/portfolio/performance?period=1M"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.series.length()").value(0));
        }

        @Test
        void shouldEnrichPositionsWithFreshLatestPrice() throws Exception {
                when(positionPort.findByUserId("default")).thenReturn(List.of(position("AAPL", "2", "90")));
                when(priceRefreshService.getFreshLatest("AAPL"))
                                .thenReturn(Optional.of(price("AAPL", "110", Instant.now())));

                mockMvc.perform(get("/api/v1/portfolio/positions/enriched"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].symbol").value("AAPL"))
                                .andExpect(jsonPath("$[0].currentPrice").value(110))
                                .andExpect(jsonPath("$[0].marketValue").value(220))
                                .andExpect(jsonPath("$[0].unrealizedPnL").value(40));
        }

        @Test
        void shouldCalculateDailyPnlFromLatestTwoCloses() throws Exception {
                when(positionPort.findByUserId("default")).thenReturn(List.of(position("AAPL", "2", "90")));
                LocalDateTime first = LocalDateTime.now().minusDays(2);
                LocalDateTime second = LocalDateTime.now().minusDays(1);
                when(priceRefreshService.getFreshLatest("AAPL"))
                                .thenReturn(Optional.of(price("AAPL", "110", Instant.now())));
                when(priceRefreshService.getFreshHistory("AAPL", "1d", "5d"))
                                .thenReturn(List.of(
                                                price("AAPL", "100", first),
                                                price("AAPL", "110", second)));

                mockMvc.perform(get("/api/v1/portfolio/summary"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.totalValue").value(220))
                                .andExpect(jsonPath("$.dailyPnL").value(20))
                                .andExpect(jsonPath("$.dailyPnLPercent").value(10.0));
        }

        @Test
        void shouldCompareMultipleInvestmentPortfoliosWithBenchmarks() throws Exception {
                LocalDateTime first = LocalDateTime.now().minusDays(2);
                LocalDateTime second = LocalDateTime.now().minusDays(1);
                when(portfolioPort.findByUserId("default")).thenReturn(List.of(
                                portfolio(10L, "ALFA", "USD"),
                                portfolio(20L, "BETA", "USD")));
                when(ledgerService.calculateHoldings(10L, "default"))
                                .thenReturn(List.of(holding(10L, "AAPL", "2")));
                when(ledgerService.calculateHoldings(20L, "default"))
                                .thenReturn(List.of(holding(20L, "MSFT", "1")));
                when(priceRefreshService.getFreshHistory("AAPL", "1d", "6mo"))
                                .thenReturn(List.of(price("AAPL", "100", first), price("AAPL", "110", second)));
                when(priceRefreshService.getFreshHistory("MSFT", "1d", "6mo"))
                                .thenReturn(List.of(price("MSFT", "50", first), price("MSFT", "55", second)));
                when(priceRefreshService.getFreshHistory("SPY", "1d", "6mo"))
                                .thenReturn(List.of(price("SPY", "400", first), price("SPY", "420", second)));

                mockMvc.perform(get("/api/v1/portfolio/performance/comparison")
                                .param("portfolioIds", "10,20")
                                .param("benchmarks", "SP500")
                                .param("period", "6M"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.period").value("6M"))
                                .andExpect(jsonPath("$.series.length()").value(3))
                                .andExpect(jsonPath("$.series[0].label").value("ALFA"))
                                .andExpect(jsonPath("$.series[0].type").value("PORTFOLIO"))
                                .andExpect(jsonPath("$.series[0].points[0].returnPct").value(0.0))
                                .andExpect(jsonPath("$.series[0].points[1].returnPct").value(10.0))
                                .andExpect(jsonPath("$.series[1].label").value("BETA"))
                                .andExpect(jsonPath("$.series[1].points[1].returnPct").value(10.0))
                                .andExpect(jsonPath("$.series[2].label").value("S&P 500"))
                                .andExpect(jsonPath("$.series[2].type").value("BENCHMARK"))
                                .andExpect(jsonPath("$.series[2].points[1].returnPct").value(5.0));
        }

        @Test
        void shouldRejectUnknownComparisonPortfolio() throws Exception {
                when(portfolioPort.findByUserId("default")).thenReturn(List.of(portfolio(10L, "ALFA", "USD")));

                mockMvc.perform(get("/api/v1/portfolio/performance/comparison")
                                .param("portfolioIds", "99")
                                .param("period", "6M"))
                                .andExpect(status().isNotFound());
        }

        @Test
        void shouldReturnComparisonSeriesWithEmptyPointsWhenHistoryIsUnavailable() throws Exception {
                when(portfolioPort.findByUserId("default")).thenReturn(List.of(portfolio(10L, "ALFA", "USD")));
                when(ledgerService.calculateHoldings(10L, "default"))
                                .thenReturn(List.of(holding(10L, "AAPL", "2")));
                when(priceRefreshService.getFreshHistory("AAPL", "1d", "6mo")).thenReturn(List.of());

                mockMvc.perform(get("/api/v1/portfolio/performance/comparison")
                                .param("portfolioIds", "10")
                                .param("period", "6M"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.series[0].label").value("ALFA"))
                                .andExpect(jsonPath("$.series[0].points.length()").value(0));
        }
        @Test
        void shouldReturnPositionPerformanceMetricsForSelectedPortfolio() throws Exception {
                LocalDateTime latest = LocalDateTime.of(2026, 7, 9, 16, 0);
                when(portfolioPort.findByUserId("default")).thenReturn(List.of(portfolio(10L, "ALFA", "USD")));
                when(ledgerService.calculateHoldings(10L, "default"))
                                .thenReturn(List.of(holding(10L, "AAPL", "2")));
                when(transactionPort.findByPortfolioIdAndUserId(10L, "default"))
                                .thenReturn(List.of(transaction(10L, "AAPL", "2026-01-02", "100")));
                when(priceRefreshService.getFreshLatest("AAPL"))
                                .thenReturn(Optional.of(price("AAPL", "140", latest)));
                when(priceRefreshService.getFreshHistory("AAPL", "1d", "1y"))
                                .thenReturn(List.of(
                                                price("AAPL", "70", LocalDateTime.of(2025, 7, 9, 16, 0)),
                                                price("AAPL", "90", LocalDateTime.of(2026, 1, 9, 16, 0)),
                                                price("AAPL", "100", LocalDateTime.of(2026, 4, 9, 16, 0)),
                                                price("AAPL", "120", LocalDateTime.of(2026, 6, 9, 16, 0)),
                                                price("AAPL", "125", LocalDateTime.of(2026, 7, 2, 16, 0)),
                                                price("AAPL", "130", LocalDateTime.of(2026, 7, 8, 16, 0)),
                                                price("AAPL", "140", latest)));

                mockMvc.perform(get("/api/v1/portfolio/positions/performance")
                                .param("portfolioId", "10"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].symbol").value("AAPL"))
                                .andExpect(jsonPath("$[0].addedDate").value("2026-01-02"))
                                .andExpect(jsonPath("$[0].costPrice").value(10))
                                .andExpect(jsonPath("$[0].currentPrice").value(140))
                                .andExpect(jsonPath("$[0].marketValue").value(280))
                                .andExpect(jsonPath("$[0].weight").value(100.0))
                                .andExpect(jsonPath("$[0].dailyReturn").value(7.6923))
                                .andExpect(jsonPath("$[0].weeklyReturn").value(12.0))
                                .andExpect(jsonPath("$[0].oneMonthReturn").value(16.6667))
                                .andExpect(jsonPath("$[0].threeMonthReturn").value(40.0))
                                .andExpect(jsonPath("$[0].sixMonthReturn").value(55.5556))
                                .andExpect(jsonPath("$[0].oneYearReturn").value(100.0))
                                .andExpect(jsonPath("$[0].totalReturn").value(1300.0));
        }

        @Test
        void shouldLeaveWindowReturnsNullWhenPositionHistoryIsInsufficient() throws Exception {
                when(portfolioPort.findByUserId("default")).thenReturn(List.of(portfolio(10L, "ALFA", "USD")));
                when(ledgerService.calculateHoldings(10L, "default"))
                                .thenReturn(List.of(holding(10L, "MSFT", "1")));
                when(transactionPort.findByPortfolioIdAndUserId(10L, "default"))
                                .thenReturn(List.of());
                when(priceRefreshService.getFreshLatest("MSFT"))
                                .thenReturn(Optional.of(price("MSFT", "55", Instant.now())));
                when(priceRefreshService.getFreshHistory("MSFT", "1d", "1y")).thenReturn(List.of());

                mockMvc.perform(get("/api/v1/portfolio/positions/performance")
                                .param("portfolioId", "10"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].symbol").value("MSFT"))
                                .andExpect(jsonPath("$[0].dailyReturn").value(nullValue()))
                                .andExpect(jsonPath("$[0].oneMonthReturn").value(nullValue()))
                                .andExpect(jsonPath("$[0].totalReturn").value(450.0));
        }
        private PortfolioPosition position(String symbol, String quantity, String avgCostPrice) {
                LocalDateTime now = LocalDateTime.now();
                return new PortfolioPosition(
                                1L,
                                "default",
                                symbol,
                                new BigDecimal(quantity),
                                new BigDecimal(avgCostPrice),
                                LocalDate.now().minusDays(10),
                                null,
                                now,
                                now);
        }

        private Portfolio portfolio(Long id, String name, String baseCurrency) {
                LocalDateTime now = LocalDateTime.now();
                return new Portfolio(id, "default", name, baseCurrency, null, false, now, now);
        }

        private PortfolioHolding holding(Long portfolioId, String symbol, String quantity) {
                return new PortfolioHolding(
                                portfolioId,
                                symbol,
                                PortfolioAssetType.US_STOCK,
                                new BigDecimal(quantity),
                                BigDecimal.TEN,
                                BigDecimal.TEN,
                                BigDecimal.ZERO,
                                "USD");
        }
        private PortfolioTransaction transaction(Long portfolioId, String symbol, String tradeDate, String price) {
                LocalDateTime now = LocalDateTime.now();
                return new PortfolioTransaction(
                                1L,
                                portfolioId,
                                "default",
                                symbol,
                                PortfolioAssetType.US_STOCK,
                                PortfolioTransactionAction.BUY,
                                BigDecimal.ONE,
                                new BigDecimal(price),
                                "USD",
                                BigDecimal.ZERO,
                                BigDecimal.ONE,
                                LocalDate.parse(tradeDate),
                                PortfolioTransactionSource.MANUAL,
                                null,
                                now,
                                now);
        }
        private PriceHistory price(String symbol, String close, LocalDateTime timestamp) {
                BigDecimal closeValue = new BigDecimal(close);
                return new PriceHistory(
                                symbol,
                                closeValue,
                                closeValue,
                                closeValue,
                                closeValue,
                                BigDecimal.valueOf(1000),
                                timestamp);
        }

        private PriceHistory price(String symbol, String close, Instant timestamp) {
                BigDecimal closeValue = new BigDecimal(close);
                return new PriceHistory(
                                symbol,
                                closeValue,
                                closeValue,
                                closeValue,
                                closeValue,
                                BigDecimal.valueOf(1000),
                                timestamp);
        }
}
