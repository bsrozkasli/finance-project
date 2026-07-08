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
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PortfolioLedgerServiceTest {

    private static final Long PORTFOLIO_ID = 1L;
    private static final String USER_ID = "default";

    @Mock
    // Mock rationale: outbound transaction port is persistence I/O boundary.
    private PortfolioTransactionPort transactionPort;

    @InjectMocks
    private PortfolioLedgerService ledgerService;

    @Test
    void shouldThrowNullPointerExceptionWhenConstructedWithNullPort() {
        assertThatThrownBy(() -> new PortfolioLedgerService(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("transactionPort");
    }

    @Test
    void shouldReturnEmptyHoldingsForEmptyTransactionList() {
        assertThat(ledgerService.calculateHoldings(List.of())).isEmpty();
    }

    @Test
    void shouldQueryPortWithPortfolioAndUserDuringCalculateHoldings() {
        when(transactionPort.findByPortfolioIdAndUserId(PORTFOLIO_ID, USER_ID))
                .thenReturn(List.of(tx("AAPL", PortfolioTransactionAction.BUY, "2", "100", "0", "1", date(2026, 6, 1))));

        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(PORTFOLIO_ID, USER_ID);

        verify(transactionPort, times(1)).findByPortfolioIdAndUserId(PORTFOLIO_ID, USER_ID);
        assertThat(holdings).hasSize(1);
        assertThat(holdings.get(0).symbol()).isEqualTo("AAPL");
    }

    @Test
    void shouldSaveTransactionAfterSuccessfulValidation() {
        when(transactionPort.findByPortfolioIdAndUserId(PORTFOLIO_ID, USER_ID))
                .thenReturn(List.of(tx("MSFT", PortfolioTransactionAction.BUY, "5", "300", "0", "1", date(2026, 6, 1))));
        PortfolioTransaction sell = tx("MSFT", PortfolioTransactionAction.SELL, "2", "320", "5", "1", date(2026, 6, 2));
        when(transactionPort.save(sell)).thenReturn(sell);

        PortfolioTransaction saved = ledgerService.addTransaction(sell);

        verify(transactionPort, times(1)).save(sell);
        assertThat(saved).isEqualTo(sell);
    }

    @Test
    void shouldNotPersistTransactionWhenSellExceedsHolding() {
        when(transactionPort.findByPortfolioIdAndUserId(PORTFOLIO_ID, USER_ID))
                .thenReturn(List.of(tx("MSFT", PortfolioTransactionAction.BUY, "2", "300", "0", "1", date(2026, 6, 1))));
        PortfolioTransaction sell = tx("MSFT", PortfolioTransactionAction.SELL, "3", "310", "0", "1", date(2026, 6, 2));

        assertThatThrownBy(() -> ledgerService.addTransaction(sell))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sell quantity exceeds current holding");

        verify(transactionPort, never()).save(any());
    }

    @Test
    void shouldIncludeBuyFeeAndFxInCostBasisAndAverageCost() {
        /*
         * BUY 10 @ 100, fee 10, fx 1.2
         * gross = 10*100 + 10 = 1010
         * base cost = 1010 * 1.2 = 1212
         * qty = 10, avg = 1212 / 10 = 121.2
         */
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(List.of(
                tx("NVDA", PortfolioTransactionAction.BUY, "10", "100", "10", "1.2", date(2026, 6, 1))
        ));

        assertThat(holdings).hasSize(1);
        PortfolioHolding h = holdings.get(0);
        assertThat(h.quantity()).isEqualByComparingTo("10");
        assertThat(h.costBasis()).isEqualByComparingTo("1212.0");
        assertThat(h.averageCost()).isEqualByComparingTo("121.20000000");
        assertThat(h.realizedPnl()).isEqualByComparingTo("0");
    }

    @Test
    void shouldCalculateWeightedAverageCostAcrossBuysWithFeesAndFx() {
        /*
         * BUY1: 10 @ 100, fee 10, fx 1 -> base cost 1010
         * BUY2:  5 @ 130, fee 5, fx 2 -> gross 655, base cost 1310
         * total cost = 2320, total qty = 15
         * average cost = 2320 / 15 = 154.66666667 (8 dp)
         */
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(List.of(
                tx("NVDA", PortfolioTransactionAction.BUY, "10", "100", "10", "1", date(2026, 6, 1)),
                tx("NVDA", PortfolioTransactionAction.BUY, "5", "130", "5", "2", date(2026, 6, 2))
        ));

        PortfolioHolding h = holdings.get(0);
        assertThat(h.quantity()).isEqualByComparingTo("15");
        assertThat(h.costBasis()).isEqualByComparingTo("2320");
        assertThat(h.averageCost()).isEqualByComparingTo("154.66666667");
        assertThat(h.averageCost().scale()).isEqualTo(8);
    }

    @Test
    void shouldCalculatePartialSellProfitWithFeeAndFx() {
        /*
         * From weighted example above: qty=15, cost=2320, avg=154.66666667
         * SELL 4 @ 200, fee 8, fx 1
         * removed cost = 4 * 154.66666667 = 618.66666668
         * proceeds base = (4*200 - 8) * 1 = 792
         * realized pnl = 792 - 618.66666668 = 173.33333332
         * remaining qty = 11
         * remaining cost = 2320 - 618.66666668 = 1701.33333332
         */
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(List.of(
                tx("NVDA", PortfolioTransactionAction.BUY, "10", "100", "10", "1", date(2026, 6, 1)),
                tx("NVDA", PortfolioTransactionAction.BUY, "5", "130", "5", "2", date(2026, 6, 2)),
                tx("NVDA", PortfolioTransactionAction.SELL, "4", "200", "8", "1", date(2026, 6, 3))
        ));

        PortfolioHolding h = holdings.get(0);
        assertThat(h.quantity()).isEqualByComparingTo("11");
        assertThat(h.costBasis()).isEqualByComparingTo("1701.33333332");
        assertThat(h.realizedPnl()).isEqualByComparingTo("173.33333332");
    }

    @Test
    void shouldCalculatePartialSellLossAndZeroPnlCases() {
        List<PortfolioHolding> loss = ledgerService.calculateHoldings(List.of(
                tx("AAPL", PortfolioTransactionAction.BUY, "10", "100", "0", "1", date(2026, 6, 1)),
                tx("AAPL", PortfolioTransactionAction.SELL, "4", "90", "10", "1", date(2026, 6, 2))
        ));
        assertThat(loss.get(0).realizedPnl()).isEqualByComparingTo("-50.00000000");

        List<PortfolioHolding> zero = ledgerService.calculateHoldings(List.of(
                tx("AAPL", PortfolioTransactionAction.BUY, "10", "100", "0", "1", date(2026, 6, 1)),
                tx("AAPL", PortfolioTransactionAction.SELL, "4", "100", "0", "1", date(2026, 6, 2))
        ));
        assertThat(zero.get(0).realizedPnl()).isEqualByComparingTo("0E-8");
    }

    @Test
    void shouldOmitHoldingAfterExactLiquidationWithoutResidue() {
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(List.of(
                tx("NVDA", PortfolioTransactionAction.BUY, "0.3", "10", "0", "1", date(2026, 6, 1)),
                tx("NVDA", PortfolioTransactionAction.BUY, "0.2", "10", "0", "1", date(2026, 6, 2)),
                tx("NVDA", PortfolioTransactionAction.SELL, "0.5", "10", "0", "1", date(2026, 6, 3))
        ));

        assertThat(holdings).isEmpty();
    }

    @Test
    void shouldRejectChronologicalSellBeforeBuyInDirectCalculation() {
        assertThatThrownBy(() -> ledgerService.calculateHoldings(List.of(
                tx("AAPL", PortfolioTransactionAction.SELL, "1", "100", "0", "1", date(2026, 6, 1)),
                tx("AAPL", PortfolioTransactionAction.BUY, "1", "90", "0", "1", date(2026, 6, 2))
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sell quantity exceeds current holding");
    }

    @Test
    void shouldRejectSellWhenQuantityExceedsBySmallestUnit() {
        assertThatThrownBy(() -> ledgerService.calculateHoldings(List.of(
                tx("AAPL", PortfolioTransactionAction.BUY, "1", "100", "0", "1", date(2026, 6, 1)),
                tx("AAPL", PortfolioTransactionAction.SELL, "1.00000001", "100", "0", "1", date(2026, 6, 2))
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sell quantity exceeds current holding");
    }

    @Test
    void shouldRejectSellAfterExactLiquidation() {
        assertThatThrownBy(() -> ledgerService.calculateHoldings(List.of(
                tx("AAPL", PortfolioTransactionAction.BUY, "1", "100", "0", "1", date(2026, 6, 1)),
                tx("AAPL", PortfolioTransactionAction.SELL, "1", "110", "0", "1", date(2026, 6, 2)),
                tx("AAPL", PortfolioTransactionAction.SELL, "0.1", "120", "0", "1", date(2026, 6, 3))
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sell quantity exceeds current holding");
    }

    @Test
    void shouldKeepSymbolsFinanciallyIsolated() {
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(List.of(
                tx("NVDA", PortfolioTransactionAction.BUY, "10", "100", "0", "1", date(2026, 6, 1)),
                tx("MSFT", PortfolioTransactionAction.BUY, "5", "200", "0", "1", date(2026, 6, 1)),
                tx("AAPL", PortfolioTransactionAction.BUY, "8", "50", "0", "1", date(2026, 6, 1)),
                tx("NVDA", PortfolioTransactionAction.SELL, "3", "120", "0", "1", date(2026, 6, 2)),
                tx("MSFT", PortfolioTransactionAction.SELL, "5", "220", "0", "1", date(2026, 6, 2))
        ));

        assertThat(holdings).hasSize(2);
        PortfolioHolding nvda = holdings.stream().filter(h -> h.symbol().equals("NVDA")).findFirst().orElseThrow();
        PortfolioHolding aapl = holdings.stream().filter(h -> h.symbol().equals("AAPL")).findFirst().orElseThrow();

        assertThat(nvda.quantity()).isEqualByComparingTo("7");
        assertThat(nvda.realizedPnl()).isEqualByComparingTo("60.00000000");

        assertThat(aapl.quantity()).isEqualByComparingTo("8");
        assertThat(aapl.realizedPnl()).isEqualByComparingTo("0");

        assertThat(holdings.stream().noneMatch(h -> h.symbol().equals("MSFT"))).isTrue();
    }

    @Test
    void shouldIgnoreCashTransferAndManualValuationForShareHoldings() {
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(List.of(
                txNoSymbol(PortfolioTransactionAction.CASH_DEPOSIT, null, null, "0", "1", date(2026, 6, 1)),
                txNoSymbol(PortfolioTransactionAction.CASH_WITHDRAWAL, null, null, "0", "1", date(2026, 6, 2)),
                txNoSymbol(PortfolioTransactionAction.TRANSFER_IN, null, null, "0", "1", date(2026, 6, 3)),
                txNoSymbol(PortfolioTransactionAction.TRANSFER_OUT, null, null, "0", "1", date(2026, 6, 4)),
                tx("AAPL", PortfolioTransactionAction.MANUAL_VALUATION, "1", "180", "0", "1", date(2026, 6, 5))
        ));

        assertThat(holdings).isEmpty();
    }

    @Test
    void shouldApplyDividendAndFeeToRealizedPnlWithoutChangingQuantity() {
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(List.of(
                tx("NVDA", PortfolioTransactionAction.BUY, "2", "100", "0", "1", date(2026, 6, 1)),
                tx("NVDA", PortfolioTransactionAction.DIVIDEND, null, "12", "0", "1.5", date(2026, 6, 2)),
                tx("NVDA", PortfolioTransactionAction.FEE, null, null, "5", "2", date(2026, 6, 3))
        ));

        PortfolioHolding h = holdings.get(0);
        assertThat(h.quantity()).isEqualByComparingTo("2");
        assertThat(h.realizedPnl()).isEqualByComparingTo("8.0");
    }

    @Test
    void shouldNormalizeSymbolsThroughTransactionDomainModel() {
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(List.of(
                tx(" aapl ", PortfolioTransactionAction.BUY, "1", "100", "0", "1", date(2026, 6, 1)),
                tx("AAPL", PortfolioTransactionAction.BUY, "1", "100", "0", "1", date(2026, 6, 2)),
                tx("aapl", PortfolioTransactionAction.SELL, "1", "110", "0", "1", date(2026, 6, 3))
        ));

        assertThat(holdings).hasSize(1);
        assertThat(holdings.get(0).symbol()).isEqualTo("AAPL");
        assertThat(holdings.get(0).quantity()).isEqualByComparingTo("1");
    }

    @Test
    void shouldSkipNullOrBlankSymbolTransactionsWhenSymbolOptional() {
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(List.of(
                tx("AAPL", PortfolioTransactionAction.BUY, "1", "100", "0", "1", date(2026, 6, 1)),
                txNoSymbol(PortfolioTransactionAction.FEE, null, null, "3", "1", date(2026, 6, 2)),
                txNoSymbol(PortfolioTransactionAction.FEE, "   ", null, "3", "1", date(2026, 6, 3))
        ));

        assertThat(holdings).hasSize(1);
        assertThat(holdings.get(0).symbol()).isEqualTo("AAPL");
        assertThat(holdings.get(0).realizedPnl()).isEqualByComparingTo("0");
    }

    @Test
    void shouldRejectInvalidTransactionValuesAtDomainBoundary() {
        assertThatThrownBy(() -> tx("AAPL", PortfolioTransactionAction.BUY, "0", "100", "0", "1", date(2026, 6, 1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("quantity must be positive");
        assertThatThrownBy(() -> tx("AAPL", PortfolioTransactionAction.BUY, "1", "100", "-1", "1", date(2026, 6, 1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("fee must not be negative");
        assertThatThrownBy(() -> tx("AAPL", PortfolioTransactionAction.BUY, "1", "100", "0", "0", date(2026, 6, 1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("fxRateToBase must be positive");
    }

    @Test
    void shouldNotMutateCallerOwnedTransactionList() {
        List<PortfolioTransaction> transactions = new ArrayList<>(List.of(
                tx("NVDA", PortfolioTransactionAction.BUY, "10", "100", "0", "1", date(2026, 6, 1)),
                tx("NVDA", PortfolioTransactionAction.SELL, "4", "120", "0", "1", date(2026, 6, 2))
        ));
        List<PortfolioTransaction> snapshot = new ArrayList<>(transactions);

        ledgerService.calculateHoldings(transactions);

        assertThat(transactions).hasSize(snapshot.size());
        assertThat(transactions).containsExactlyElementsOf(snapshot);
    }

    @Test
    void shouldProduceDeterministicOutputAcrossListImplementations() {
        List<PortfolioTransaction> base = List.of(
                tx("NVDA", PortfolioTransactionAction.BUY, "10", "100", "0", "1", date(2026, 6, 1)),
                tx("NVDA", PortfolioTransactionAction.BUY, "5", "130", "0", "1", date(2026, 6, 2)),
                tx("NVDA", PortfolioTransactionAction.SELL, "4", "120", "0", "1", date(2026, 6, 3))
        );

        List<PortfolioHolding> arrayRun = ledgerService.calculateHoldings(new ArrayList<>(base));
        List<PortfolioHolding> immutableRun = ledgerService.calculateHoldings(List.copyOf(base));

        assertThat(arrayRun).isEqualTo(immutableRun);
    }

    @Test
    void shouldMaintainEightDecimalAverageCostForRepeatingDecimalCase() {
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(List.of(
                tx("AAPL", PortfolioTransactionAction.BUY, "1", "100", "0", "1", date(2026, 6, 1)),
                tx("AAPL", PortfolioTransactionAction.BUY, "2", "101", "0", "1", date(2026, 6, 2))
        ));

        PortfolioHolding h = holdings.get(0);
        assertThat(h.averageCost()).isEqualByComparingTo("100.66666667");
        assertThat(h.averageCost().scale()).isEqualTo(8);
    }

    @Test
    void shouldThrowForNullTransactionEntryInList() {
        assertThatThrownBy(() -> ledgerService.calculateHoldings(List.of(
                tx("AAPL", PortfolioTransactionAction.BUY, "1", "100", "0", "1", date(2026, 6, 1)),
                null
        )))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void shouldDefaultBlankUserToDefaultAtTransactionConstruction() {
        PortfolioTransaction t = new PortfolioTransaction(
                null,
                PORTFOLIO_ID,
                "   ",
                "AAPL",
                PortfolioAssetType.US_STOCK,
                PortfolioTransactionAction.BUY,
                new BigDecimal("1"),
                new BigDecimal("100"),
                "usd",
                BigDecimal.ZERO,
                BigDecimal.ONE,
                LocalDate.of(2026, 6, 1),
                PortfolioTransactionSource.MANUAL,
                null,
                null,
                null
        );

        assertThat(t.userId()).isEqualTo("default");
        assertThat(t.currency()).isEqualTo("USD");
    }

    @Test
    void shouldTreatChronologicalOrderAsContractForEquivalentTransactionSet() {
        List<PortfolioTransaction> chronological = List.of(
                tx("AAPL", PortfolioTransactionAction.BUY, "1", "100", "0", "1", date(2026, 6, 1)),
                tx("AAPL", PortfolioTransactionAction.SELL, "1", "110", "0", "1", date(2026, 6, 2))
        );

        List<PortfolioTransaction> reversedInput = List.of(
                tx("AAPL", PortfolioTransactionAction.SELL, "1", "110", "0", "1", date(2026, 6, 2)),
                tx("AAPL", PortfolioTransactionAction.BUY, "1", "100", "0", "1", date(2026, 6, 1))
        );

        List<PortfolioHolding> chronologicalResult = ledgerService.calculateHoldings(chronological);

        assertThatCode(() -> ledgerService.calculateHoldings(reversedInput)).doesNotThrowAnyException();
        assertThat(ledgerService.calculateHoldings(reversedInput)).isEqualTo(chronologicalResult);
    }

    @Test
    void shouldClarifyDividendPriceSemanticsBeforeAssertingPerShareCalculation() {
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(List.of(
                tx("AAPL", PortfolioTransactionAction.BUY, "10", "100", "0", "1", date(2026, 6, 1)),
                tx("AAPL", PortfolioTransactionAction.DIVIDEND, null, "2", "0", "1", date(2026, 6, 2))
        ));

        assertThat(holdings).hasSize(1);
    }

    @Test
    void shouldClarifyDuplicateDetectionOwnership() {
        PortfolioTransaction buy = tx("AAPL", PortfolioTransactionAction.BUY, "1", "100", "0", "1", date(2026, 6, 1));
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(List.of(buy, buy));
        assertThat(holdings).hasSize(1);
    }

    private static LocalDate date(int year, int month, int day) {
        return LocalDate.of(year, month, day);
    }

    private PortfolioTransaction tx(
            String symbol,
            PortfolioTransactionAction action,
            String quantity,
            String price,
            String fee,
            String fxRateToBase,
            LocalDate tradeDate
    ) {
        return new PortfolioTransaction(
                null,
                PORTFOLIO_ID,
                USER_ID,
                symbol,
                PortfolioAssetType.US_STOCK,
                action,
                quantity == null ? null : new BigDecimal(quantity),
                price == null ? null : new BigDecimal(price),
                "USD",
                fee == null ? null : new BigDecimal(fee),
                fxRateToBase == null ? null : new BigDecimal(fxRateToBase),
                tradeDate,
                PortfolioTransactionSource.MANUAL,
                null,
                null,
                null
        );
    }

    private PortfolioTransaction txNoSymbol(
            PortfolioTransactionAction action,
            String symbol,
            String price,
            String fee,
            String fxRateToBase,
            LocalDate tradeDate
    ) {
        return new PortfolioTransaction(
                null,
                PORTFOLIO_ID,
                USER_ID,
                symbol,
                PortfolioAssetType.OTHER,
                action,
                null,
                price == null ? null : new BigDecimal(price),
                "USD",
                fee == null ? null : new BigDecimal(fee),
                fxRateToBase == null ? null : new BigDecimal(fxRateToBase),
                tradeDate,
                PortfolioTransactionSource.MANUAL,
                null,
                null,
                null
        );
    }
}
