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

/**
 * PRD-FR-014 (holdings, basis, realized activity): replaying persisted ledger events reproduces the
 * state calculated from the events as submitted. Exposures are not modelled yet (EPIC-002 Task 3).
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class PortfolioLedgerReplayTest {

    private static final String USER = "replay-user";

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
    void replayOfPersistedEventsReproducesHoldingsBasisAndRealizedActivity() {
        portfolioId = portfolioPort.save(new Portfolio(null, USER, "Replay", "USD", null, false, null, null)).id();
        List<PortfolioTransaction> submitted = List.of(
                tx("AAPL", PortfolioTransactionAction.BUY, "10", "100", "1.5", "1", 1),
                tx("AAPL", PortfolioTransactionAction.BUY, "5", "120", "0", "1", 2),
                tx("AAPL", PortfolioTransactionAction.SELL, "6", "130", "2", "1", 3),
                tx("AAPL", PortfolioTransactionAction.DIVIDEND, "0", "12.5", "0", "1", 4),
                tx("SAP", PortfolioTransactionAction.BUY, "3", "90", "1", "1.08", 5));

        submitted.forEach(ledgerService::addTransaction);

        List<PortfolioHolding> expected = ledgerService.calculateHoldings(submitted);
        List<PortfolioHolding> replayed = ledgerService.calculateHoldings(portfolioId, USER);

        assertThat(replayed).hasSameSizeAs(expected).hasSize(2);
        assertThat(transactionPort.findByPortfolioIdAndUserId(portfolioId, USER)).hasSize(5);
        for (int i = 0; i < expected.size(); i++) {
            PortfolioHolding want = expected.get(i);
            PortfolioHolding got = replayed.get(i);
            assertThat(got.symbol()).isEqualTo(want.symbol());
            assertThat(got.quantity()).isEqualByComparingTo(want.quantity());
            assertThat(got.averageCost()).isEqualByComparingTo(want.averageCost());
            assertThat(got.costBasis()).isEqualByComparingTo(want.costBasis());
            assertThat(got.realizedPnl()).isEqualByComparingTo(want.realizedPnl());
            assertThat(got.currency()).isEqualTo(want.currency());
        }
        PortfolioHolding aapl = replayed.stream().filter(h -> h.symbol().equals("AAPL")).findFirst().orElseThrow();
        assertThat(aapl.quantity()).isEqualByComparingTo("9");
    }

    private PortfolioTransaction tx(String symbol, PortfolioTransactionAction action, String qty, String price,
                                    String fee, String fx, int day) {
        return new PortfolioTransaction(null, portfolioId, USER, symbol, PortfolioAssetType.US_STOCK, action,
                new BigDecimal(qty), new BigDecimal(price), "USD", new BigDecimal(fee), new BigDecimal(fx),
                LocalDate.of(2026, 10, day), PortfolioTransactionSource.MANUAL, null, null, null);
    }
}
