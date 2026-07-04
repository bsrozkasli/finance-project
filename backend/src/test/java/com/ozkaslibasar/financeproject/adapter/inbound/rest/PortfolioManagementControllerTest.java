package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.JournalTradePort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PortfolioManagementController.class)
class PortfolioManagementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PortfolioPort portfolioPort;

    @MockitoBean
    private PortfolioTransactionPort transactionPort;

    @MockitoBean
    private PortfolioLedgerService ledgerService;

    @MockitoBean
    private JournalTradePort journalTradePort;

    @Test
    void shouldCreateTransactionAndLinkedJournalEntryWhenJournalNotesExist() throws Exception {
        Portfolio portfolio = portfolio();
        PortfolioTransaction saved = transaction(10L, PortfolioTransactionAction.BUY, "NVDA", "5", "120");
        when(portfolioPort.findByIdAndUserId(1L, "default")).thenReturn(Optional.of(portfolio));
        when(ledgerService.addTransaction(any(PortfolioTransaction.class))).thenReturn(saved);

        mockMvc.perform(post("/api/v1/portfolios/1/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol":"NVDA",
                                  "assetType":"US_STOCK",
                                  "action":"BUY",
                                  "quantity":5,
                                  "price":120,
                                  "currency":"USD",
                                  "journalNotes":"Initial thesis"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.symbol").value("NVDA"));

        verify(journalTradePort).save(any());
    }

    @Test
    void shouldReturn422WhenSellQuantityExceedsHolding() throws Exception {
        when(portfolioPort.findByIdAndUserId(1L, "default")).thenReturn(Optional.of(portfolio()));
        when(ledgerService.addTransaction(any(PortfolioTransaction.class)))
                .thenThrow(new IllegalArgumentException("sell quantity exceeds current holding for MSFT"));

        mockMvc.perform(post("/api/v1/portfolios/1/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol":"MSFT",
                                  "assetType":"US_STOCK",
                                  "action":"SELL",
                                  "quantity":3,
                                  "price":310,
                                  "currency":"USD"
                                }
                                """))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void shouldDeleteLinkedJournalEntryWhenTransactionIsDeleted() throws Exception {
        PortfolioTransaction saved = transaction(10L, PortfolioTransactionAction.BUY, "NVDA", "5", "120");
        when(portfolioPort.findByIdAndUserId(1L, "default")).thenReturn(Optional.of(portfolio()));
        when(transactionPort.findByIdAndPortfolioIdAndUserId(10L, 1L, "default")).thenReturn(Optional.of(saved));

        mockMvc.perform(delete("/api/v1/portfolios/1/transactions/10"))
                .andExpect(status().isNoContent());

        verify(journalTradePort).deleteByPortfolioIdAndTransactionIdAndUserId(1L, 10L, "default");
        verify(transactionPort).deleteByIdAndPortfolioIdAndUserId(10L, 1L, "default");
    }

    private Portfolio portfolio() {
        return new Portfolio(1L, "default", "ABD", "USD", null, true, null, null);
    }

    private PortfolioTransaction transaction(
            Long id,
            PortfolioTransactionAction action,
            String symbol,
            String quantity,
            String price) {
        return new PortfolioTransaction(
                id,
                1L,
                "default",
                symbol,
                PortfolioAssetType.US_STOCK,
                action,
                new BigDecimal(quantity),
                new BigDecimal(price),
                "USD",
                BigDecimal.ZERO,
                BigDecimal.ONE,
                LocalDate.parse("2026-06-30"),
                PortfolioTransactionSource.MANUAL,
                null,
                null,
                null);
    }
}
