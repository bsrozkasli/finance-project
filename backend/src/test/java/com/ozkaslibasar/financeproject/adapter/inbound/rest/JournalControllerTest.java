package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.JournalTrade;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStatus;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeType;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.JournalTradePort;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = JournalController.class)
class JournalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JournalTradePort tradePort;

    @MockitoBean
    private PriceRefreshService priceRefreshService;

    @Test
    void shouldEnrichOpenTradesWithFreshLatestPrice() throws Exception {
        when(tradePort.findByUserId("default")).thenReturn(List.of(openTrade("AAPL", "2", "90", "100")));
        when(priceRefreshService.getFreshLatest("AAPL"))
                .thenReturn(Optional.of(price("AAPL", "110")));

        mockMvc.perform(get("/api/v1/journal/trades"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$.content[0].currentPrice").value(110))
                .andExpect(jsonPath("$.content[0].marketValue").value(220))
                .andExpect(jsonPath("$.content[0].pnl").value(40))
                .andExpect(jsonPath("$.content[0].returnPct").value(22.2222));
    }

    @Test
    void shouldNotRefreshClosedTradesOnRead() throws Exception {
        when(tradePort.findByUserId("default")).thenReturn(List.of(closedTrade("MSFT", "1", "200", "225")));

        mockMvc.perform(get("/api/v1/journal/trades"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].symbol").value("MSFT"))
                .andExpect(jsonPath("$.content[0].currentPrice").value(225));

        verifyNoInteractions(priceRefreshService);
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
        BigDecimal returnPct = pnl.multiply(BigDecimal.valueOf(100)).divide(purchase.multiply(qty), 4, java.math.RoundingMode.HALF_UP);
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
