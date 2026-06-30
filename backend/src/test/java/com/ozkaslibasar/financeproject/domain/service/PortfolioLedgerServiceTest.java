package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PortfolioLedgerServiceTest {

    @Mock
    private PortfolioTransactionPort transactionPort;

    @InjectMocks
    private PortfolioLedgerService ledgerService;

    @Test
    void shouldCalculateHoldingsFromBuyAndSellTransactions() {
        List<PortfolioTransaction> transactions = List.of(
                transaction(PortfolioTransactionAction.BUY, "NVDA", "10", "100", "1"),
                transaction(PortfolioTransactionAction.SELL, "NVDA", "4", "120", "1")
        );

        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(transactions);

        assertThat(holdings).hasSize(1);
        PortfolioHolding holding = holdings.get(0);
        assertThat(holding.quantity()).isEqualByComparingTo("6");
        assertThat(holding.averageCost()).isEqualByComparingTo("100.00000000");
        assertThat(holding.costBasis()).isEqualByComparingTo("600.00000000");
        assertThat(holding.realizedPnl()).isEqualByComparingTo("80.00000000");
    }

    @Test
    void shouldRejectSellWhenQuantityExceedsHolding() {
        when(transactionPort.findByPortfolioIdAndUserId(1L, "default"))
                .thenReturn(List.of(transaction(PortfolioTransactionAction.BUY, "MSFT", "2", "300", "1")));

        PortfolioTransaction sell = transaction(PortfolioTransactionAction.SELL, "MSFT", "3", "310", "1");

        assertThatThrownBy(() -> ledgerService.addTransaction(sell))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sell quantity exceeds current holding");
    }

    private PortfolioTransaction transaction(
            PortfolioTransactionAction action,
            String symbol,
            String quantity,
            String price,
            String fxRateToBase) {
        return new PortfolioTransaction(
                null,
                1L,
                "default",
                symbol,
                PortfolioAssetType.US_STOCK,
                action,
                new BigDecimal(quantity),
                new BigDecimal(price),
                "USD",
                BigDecimal.ZERO,
                new BigDecimal(fxRateToBase),
                LocalDate.parse("2026-06-30"),
                PortfolioTransactionSource.MANUAL,
                null,
                null,
                null);
    }
}
