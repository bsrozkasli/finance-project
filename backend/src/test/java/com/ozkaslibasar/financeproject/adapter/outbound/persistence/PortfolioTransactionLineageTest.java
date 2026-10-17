package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** PRD-FR-011: each manual ledger event keeps a stable id and its source across a commit and re-read. */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class PortfolioTransactionLineageTest {

    private static final String USER = "lineage-user";

    @Autowired
    private PortfolioPort portfolioPort;
    @Autowired
    private PortfolioTransactionPort transactionPort;
    @Autowired
    private PortfolioLedgerService ledgerService;

    private Long portfolioId;

    @AfterEach
    void cleanUp() {
        if (portfolioId != null) {
            portfolioPort.deleteByIdAndUserId(portfolioId, USER);
        }
    }

    @Test
    void manualEventsKeepStableIdAndSourceAfterCommitAndReadback() {
        portfolioId = portfolioPort.save(new Portfolio(null, USER, "Lineage", "USD", null, false, null, null)).id();

        PortfolioTransaction buy = ledgerService.addTransaction(transaction(PortfolioTransactionAction.BUY, "10", "100"));
        PortfolioTransaction sell = ledgerService.addTransaction(transaction(PortfolioTransactionAction.SELL, "4", "110"));

        List<PortfolioTransaction> reread = transactionPort.findByPortfolioIdAndUserId(portfolioId, USER);

        assertThat(buy.id()).isNotNull();
        assertThat(sell.id()).isNotNull().isNotEqualTo(buy.id());
        assertThat(reread).extracting(PortfolioTransaction::id).containsExactly(buy.id(), sell.id());
        assertThat(reread).extracting(PortfolioTransaction::source)
                .containsOnly(PortfolioTransactionSource.MANUAL);
        assertThat(transactionPort.findByIdAndPortfolioIdAndUserId(buy.id(), portfolioId, USER))
                .get().usingRecursiveComparison()
                .withComparatorForType(BigDecimal::compareTo, BigDecimal.class)
                .ignoringFields("createdAt", "updatedAt").isEqualTo(buy);

        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(portfolioId, USER);
        assertThat(holdings).hasSize(1);
        assertThat(holdings.get(0).quantity()).isEqualByComparingTo("6");
    }

    private PortfolioTransaction transaction(PortfolioTransactionAction action, String quantity, String price) {
        return new PortfolioTransaction(null, portfolioId, USER, "AAPL", PortfolioAssetType.US_STOCK, action,
                new BigDecimal(quantity), new BigDecimal(price), "USD", BigDecimal.ZERO, BigDecimal.ONE,
                LocalDate.of(2026, 10, action == PortfolioTransactionAction.BUY ? 1 : 2),
                PortfolioTransactionSource.MANUAL, null, null, null);
    }
}
