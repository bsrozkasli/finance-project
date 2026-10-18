package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.contract.ContractFixtures;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioPosition;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPositionPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pins dashboard response shapes to docs/contracts/fixtures. Ports and the price
 * service are mocked because they are the I/O boundary (database and providers).
 */
@WebMvcTest(controllers = PortfolioDashboardController.class)
class PortfolioDashboardContractTest {

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

    @BeforeEach
    void stubOnePricedPosition() {
        LocalDateTime previous = LocalDateTime.now().minusDays(2);
        LocalDateTime latest = LocalDateTime.now().minusDays(1);
        when(positionPort.findByUserId("default")).thenReturn(List.of(position("AAPL", "2", "90")));
        when(priceRefreshService.getFreshLatest("AAPL")).thenReturn(Optional.of(price("AAPL", "110", latest)));
        when(priceRefreshService.getFreshHistory(eq("AAPL"), eq("1d"), anyString()))
                .thenReturn(List.of(price("AAPL", "100", previous), price("AAPL", "110", latest)));
        when(priceRefreshService.getFreshHistory(eq("SPY"), eq("1d"), anyString()))
                .thenReturn(List.of(price("SPY", "400", previous), price("SPY", "440", latest)));
    }

    @Test
    void summaryMatchesSharedContractFixture() throws Exception {
        String body = mockMvc.perform(get("/api/v1/portfolio/summary"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        ContractFixtures.assertSameShape("portfolio-summary.json", body);
    }

    @Test
    void performanceMatchesSharedContractFixture() throws Exception {
        String body = mockMvc.perform(get("/api/v1/portfolio/performance")
                        .param("period", "1M")
                        .param("benchmark", "SP500"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        ContractFixtures.assertSameShape("portfolio-performance.json", body);
    }

    @Test
    void enrichedPositionsMatchSharedContractFixture() throws Exception {
        String body = mockMvc.perform(get("/api/v1/portfolio/positions/enriched"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        ContractFixtures.assertSameShape("portfolio-enriched-positions.json", body);
    }

    @Test
    void errorBodyMatchesSharedContractFixture() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        when(portfolioPort.findByUserId("default"))
                .thenReturn(List.of(new Portfolio(10L, "default", "ALFA", "USD", null, false, now, now)));

        String body = mockMvc.perform(get("/api/v1/portfolio/performance/comparison")
                        .param("portfolioIds", "99")
                        .param("period", "6M"))
                .andExpect(status().isNotFound())
                .andReturn().getResponse().getContentAsString();

        ContractFixtures.assertSameShape("error-response.json", body);
    }

    private PortfolioPosition position(String symbol, String quantity, String avgCostPrice) {
        LocalDateTime now = LocalDateTime.now();
        return new PortfolioPosition(1L, "default", symbol, new BigDecimal(quantity), new BigDecimal(avgCostPrice),
                LocalDate.now().minusDays(10), null, now, now);
    }

    private PriceHistory price(String symbol, String close, LocalDateTime timestamp) {
        BigDecimal value = new BigDecimal(close);
        return new PriceHistory(symbol, value, value, value, value, BigDecimal.valueOf(1000), timestamp);
    }
}
