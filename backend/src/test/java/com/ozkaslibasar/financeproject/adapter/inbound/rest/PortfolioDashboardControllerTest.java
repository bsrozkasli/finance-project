package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.PortfolioPosition;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPositionPort;
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
    private PriceRefreshService priceRefreshService;

    @Test
    void shouldBuildPerformanceSeriesFromFreshPriceHistory() throws Exception {
        when(positionPort.findByUserId("default")).thenReturn(List.of(position("AAPL", "2", "90")));
        when(priceRefreshService.getFreshHistory("AAPL", "1d", "1mo"))
                .thenReturn(List.of(
                        price("AAPL", "100", LocalDateTime.now().minusDays(2)),
                        price("AAPL", "110", LocalDateTime.now().minusDays(1))
                ));

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
                        price("AAPL", "110", second)
                ));
        when(priceRefreshService.getFreshHistory("SPY", "1d", "1mo"))
                .thenReturn(List.of(
                        price("SPY", "400", first),
                        price("SPY", "440", second)
                ));

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
                        price("AAPL", "110", second)
                ));

        mockMvc.perform(get("/api/v1/portfolio/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalValue").value(220))
                .andExpect(jsonPath("$.dailyPnL").value(20))
                .andExpect(jsonPath("$.dailyPnLPercent").value(10.0));
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
