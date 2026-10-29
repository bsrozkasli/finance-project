package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.JournalTrade;
import com.ozkaslibasar.financeproject.domain.model.JournalTradePage;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStats;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStatus;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeType;
import com.ozkaslibasar.financeproject.domain.model.PriceStatus;
import com.ozkaslibasar.financeproject.contract.ContractFixtures;
import com.ozkaslibasar.financeproject.domain.service.JournalTradeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = JournalController.class)
class JournalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JournalTradeService journalTradeService;

    @Test
    void shouldListTradesFromService() throws Exception {
        JournalTrade trade = trade("AAPL", "2", "90", "110", JournalTradeStatus.OPEN);
        when(journalTradeService.list("default", 0, 50))
                .thenReturn(new JournalTradePage(List.of(trade), 1, 1, 0));

        mockMvc.perform(get("/api/v1/journal/trades"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$.content[0].currentPrice").value(110))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.number").value(0));
    }

    @Test
    void shouldSerializePriceProvenanceOnAStaleOpenTrade() throws Exception {
        JournalTrade base = trade("AAPL", "2", "90", "110", JournalTradeStatus.OPEN);
        JournalTrade stale = withProvenance(base, Instant.parse("2026-10-20T20:00:00Z"), PriceStatus.STALE);
        when(journalTradeService.list("default", 0, 50)).thenReturn(new JournalTradePage(List.of(stale), 1, 1, 0));

        String body = mockMvc.perform(get("/api/v1/journal/trades"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].priceAsOf").value("2026-10-20T20:00:00Z"))
                .andExpect(jsonPath("$.content[0].priceStatus").value("STALE"))
                .andExpect(jsonPath("$.content[0].currentPrice").value(110))
                .andExpect(jsonPath("$.content[0].marketValue").value(220))
                .andExpect(jsonPath("$.content[0].pnl").value(40))
                .andExpect(jsonPath("$.content[0].status").value("OPEN"))
                .andReturn().getResponse().getContentAsString();

        ContractFixtures.assertSameShape("journal-trade.json", new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(body).get("content").get(0).toString());
    }

    @Test
    void shouldSerializeAbsentPriceProvenanceAsJsonNull() throws Exception {
        JournalTrade closed = trade("MSFT", "1", "200", "225", JournalTradeStatus.CLOSED);
        when(journalTradeService.list("default", 0, 50)).thenReturn(new JournalTradePage(List.of(closed), 1, 1, 0));

        String body = mockMvc.perform(get("/api/v1/journal/trades"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].currentPrice").value(225))
                .andReturn().getResponse().getContentAsString();

        com.fasterxml.jackson.databind.JsonNode first = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(body).get("content").get(0);
        org.assertj.core.api.Assertions.assertThat(first.has("priceAsOf")).isTrue();
        org.assertj.core.api.Assertions.assertThat(first.get("priceAsOf").isNull()).isTrue();
        org.assertj.core.api.Assertions.assertThat(first.has("priceStatus")).isTrue();
        org.assertj.core.api.Assertions.assertThat(first.get("priceStatus").isNull()).isTrue();
    }

    private JournalTrade withProvenance(JournalTrade t, Instant asOf, PriceStatus priceStatus) {
        return new JournalTrade(t.id(), t.userId(), t.symbol(), t.company(), t.type(), t.quantity(),
                t.purchasePrice(), t.currentPrice(), t.marketValue(), t.commission(), t.strategy(), t.notes(),
                t.tags(), t.openedAt(), t.closedAt(), t.status(), t.pnl(), t.returnPct(), t.holdingDays(),
                t.portfolioId(), t.transactionId(), t.createdAt(), t.updatedAt(), asOf, priceStatus);
    }

    @Test
    void shouldReturnStatsFromService() throws Exception {
        when(journalTradeService.stats("default"))
                .thenReturn(new JournalTradeStats(
                        2,
                        1,
                        1,
                        new BigDecimal("100.0000"),
                        new BigDecimal("12.5000"),
                        "AAPL",
                        "MSFT"));

        mockMvc.perform(get("/api/v1/journal/trades/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTrades").value(2))
                .andExpect(jsonPath("$.openTrades").value(1))
                .andExpect(jsonPath("$.closedTrades").value(1))
                .andExpect(jsonPath("$.winRate").value(100.0000))
                .andExpect(jsonPath("$.avgReturn").value(12.5000))
                .andExpect(jsonPath("$.bestTrade").value("AAPL"))
                .andExpect(jsonPath("$.worstTrade").value("MSFT"));
    }

    @Test
    void shouldMapInvalidTradeToBadRequest() throws Exception {
        when(journalTradeService.add(any())).thenThrow(new IllegalArgumentException("quantity must be positive"));

        mockMvc.perform(post("/api/v1/journal/trades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol":"AAPL",
                                  "type":"BUY",
                                  "quantity":0,
                                  "purchasePrice":100
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldMapMissingTradeToNotFoundOnUpdate() throws Exception {
        when(journalTradeService.update(eq(99L), any())).thenThrow(new NoSuchElementException("Trade not found: 99"));

        mockMvc.perform(put("/api/v1/journal/trades/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol":"AAPL",
                                  "type":"BUY",
                                  "quantity":1,
                                  "purchasePrice":100
                                }
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldMapMissingTradeToNotFoundOnDelete() throws Exception {
        org.mockito.Mockito.doThrow(new NoSuchElementException("Trade not found: 99"))
                .when(journalTradeService).delete(99L, "default");

        mockMvc.perform(delete("/api/v1/journal/trades/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldDeleteExistingTrade() throws Exception {
        mockMvc.perform(delete("/api/v1/journal/trades/10"))
                .andExpect(status().isNoContent());

        verify(journalTradeService).delete(10L, "default");
    }

    private JournalTrade trade(String symbol, String quantity, String purchasePrice, String currentPrice, JournalTradeStatus status) {
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
                status == JournalTradeStatus.CLOSED ? LocalDate.now() : null,
                status,
                pnl,
                returnPct,
                null,
                null,
                null,
                null,
                null);
    }
}
