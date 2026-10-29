package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.FinnhubClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.tiingo.TiingoClient;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPositionPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.WatchlistPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The portfolio news route reads holdings through the injected, lock-aware ledger service bean. */
@WebMvcTest(controllers = CategorizedNewsController.class)
class CategorizedNewsControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private FinnhubClient finnhubClient;
    @MockitoBean
    private TiingoClient tiingoClient;
    @MockitoBean
    private PortfolioPositionPort portfolioPositionPort;
    @MockitoBean
    private PortfolioPort portfolioPort;
    @MockitoBean
    private WatchlistPort watchlistPort;
    @MockitoBean
    private PortfolioLedgerService ledger;

    @Test
    void portfolioNewsUsesTheInjectedLedgerServiceForHoldingSymbols() throws Exception {
        when(portfolioPort.findByUserId("default")).thenReturn(
                List.of(new Portfolio(1L, "default", "P", "USD", null, false, null, null)));
        when(ledger.calculateHoldings(1L, "default")).thenReturn(List.of(new PortfolioHolding(1L, "aapl",
                PortfolioAssetType.US_STOCK, BigDecimal.TEN, BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ZERO, "USD")));

        mockMvc.perform(get("/api/v1/news/portfolio?portfolioId=1")).andExpect(status().isOk());

        verify(finnhubClient).getCompanyNews(eq("AAPL"), any(), any());
        verify(tiingoClient).getNews("AAPL");
    }
}
