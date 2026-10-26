package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioLedgerLockPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** R-17: voiding is validated against the remaining events and runs under the portfolio lock. */
@ExtendWith(MockitoExtension.class)
class PortfolioLedgerVoidTest {

    private static final Long PORTFOLIO_ID = 1L;
    private static final String USER_ID = "default";
    private static final Instant VOIDED_AT = Instant.parse("2026-10-25T10:00:00Z");

    @Mock
    // Mock rationale: outbound transaction port is persistence I/O boundary.
    private PortfolioTransactionPort transactionPort;

    @Mock
    // Mock rationale: the lock is a persistence-transaction boundary; here it simply runs the work.
    private PortfolioLedgerLockPort lockPort;

    private PortfolioLedgerService ledger;

    @BeforeEach
    void setUp() {
        when(lockPort.withPortfolioLock(any(), any()))
                .thenAnswer(invocation -> ((Supplier<?>) invocation.getArgument(1)).get());
        ledger = new PortfolioLedgerService(transactionPort, lockPort);
    }

    @Test
    void shouldRefuseVoidingABuyThatALaterSellDependsOn() {
        PortfolioTransaction buy = tx(1L, "AAPL", PortfolioTransactionAction.BUY, "10", LocalDate.of(2026, 6, 1));
        PortfolioTransaction sell = tx(2L, "AAPL", PortfolioTransactionAction.SELL, "4", LocalDate.of(2026, 6, 2));
        when(transactionPort.findByPortfolioIdAndUserId(PORTFOLIO_ID, USER_ID)).thenReturn(List.of(buy, sell));
        Runnable journalDelete = mock(Runnable.class);

        assertThatThrownBy(() -> ledger.voidTransaction(PORTFOLIO_ID, USER_ID, 1L, VOIDED_AT, journalDelete))
                .isInstanceOf(LedgerInconsistencyException.class)
                .hasMessageContaining("AAPL");

        verify(journalDelete, never()).run();
        verify(transactionPort, never()).voidByIdAndPortfolioIdAndUserId(any(), any(), any(), any());
    }

    @Test
    void shouldVoidTheSellAndRunTheSameTransactionWorkOnce() {
        PortfolioTransaction buy = tx(1L, "AAPL", PortfolioTransactionAction.BUY, "10", LocalDate.of(2026, 6, 1));
        PortfolioTransaction sell = tx(2L, "AAPL", PortfolioTransactionAction.SELL, "4", LocalDate.of(2026, 6, 2));
        when(transactionPort.findByPortfolioIdAndUserId(PORTFOLIO_ID, USER_ID)).thenReturn(List.of(buy, sell));
        Runnable journalDelete = mock(Runnable.class);

        ledger.voidTransaction(PORTFOLIO_ID, USER_ID, 2L, VOIDED_AT, journalDelete);

        InOrder order = inOrder(lockPort, journalDelete, transactionPort);
        order.verify(lockPort).withPortfolioLock(eq(PORTFOLIO_ID), any());
        order.verify(journalDelete, times(1)).run();
        order.verify(transactionPort).voidByIdAndPortfolioIdAndUserId(2L, PORTFOLIO_ID, USER_ID, VOIDED_AT);
    }

    @Test
    void shouldVoidAnIndependentEvent() {
        PortfolioTransaction aapl = tx(1L, "AAPL", PortfolioTransactionAction.BUY, "10", LocalDate.of(2026, 6, 1));
        PortfolioTransaction msft = tx(2L, "MSFT", PortfolioTransactionAction.BUY, "3", LocalDate.of(2026, 6, 2));
        PortfolioTransaction sell = tx(3L, "AAPL", PortfolioTransactionAction.SELL, "4", LocalDate.of(2026, 6, 3));
        when(transactionPort.findByPortfolioIdAndUserId(PORTFOLIO_ID, USER_ID)).thenReturn(List.of(aapl, msft, sell));
        Runnable journalDelete = mock(Runnable.class);

        ledger.voidTransaction(PORTFOLIO_ID, USER_ID, 2L, VOIDED_AT, journalDelete);

        verify(journalDelete, times(1)).run();
        verify(transactionPort).voidByIdAndPortfolioIdAndUserId(2L, PORTFOLIO_ID, USER_ID, VOIDED_AT);
    }

    @Test
    void shouldVoidABuyWhenNoLaterEventDependsOnIt() {
        PortfolioTransaction first = tx(1L, "AAPL", PortfolioTransactionAction.BUY, "10", LocalDate.of(2026, 6, 1));
        PortfolioTransaction second = tx(2L, "AAPL", PortfolioTransactionAction.BUY, "5", LocalDate.of(2026, 6, 2));
        PortfolioTransaction sell = tx(3L, "AAPL", PortfolioTransactionAction.SELL, "4", LocalDate.of(2026, 6, 3));
        when(transactionPort.findByPortfolioIdAndUserId(PORTFOLIO_ID, USER_ID)).thenReturn(List.of(first, second, sell));

        ledger.voidTransaction(PORTFOLIO_ID, USER_ID, 2L, VOIDED_AT, () -> { });

        verify(transactionPort).voidByIdAndPortfolioIdAndUserId(2L, PORTFOLIO_ID, USER_ID, VOIDED_AT);
    }

    @Test
    void shouldReportNotFoundForAnUnknownOrAlreadyVoidedId() {
        PortfolioTransaction buy = tx(1L, "AAPL", PortfolioTransactionAction.BUY, "10", LocalDate.of(2026, 6, 1));
        when(transactionPort.findByPortfolioIdAndUserId(PORTFOLIO_ID, USER_ID)).thenReturn(List.of(buy));
        Runnable journalDelete = mock(Runnable.class);

        assertThatThrownBy(() -> ledger.voidTransaction(PORTFOLIO_ID, USER_ID, 99L, VOIDED_AT, journalDelete))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("99");

        verify(journalDelete, never()).run();
        verify(transactionPort, never()).voidByIdAndPortfolioIdAndUserId(any(), any(), any(), any());
    }

    @Test
    void shouldLeaveTheEventActiveWhenTheSameTransactionWorkFails() {
        PortfolioTransaction buy = tx(1L, "AAPL", PortfolioTransactionAction.BUY, "10", LocalDate.of(2026, 6, 1));
        when(transactionPort.findByPortfolioIdAndUserId(PORTFOLIO_ID, USER_ID)).thenReturn(List.of(buy));
        Runnable failing = () -> {
            throw new IllegalStateException("journal delete failed");
        };

        assertThatThrownBy(() -> ledger.voidTransaction(PORTFOLIO_ID, USER_ID, 1L, VOIDED_AT, failing))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("journal delete failed");

        // The work runs before the void, so a failure means the void is never attempted; the real lock rolls back.
        verify(transactionPort, never()).voidByIdAndPortfolioIdAndUserId(any(), any(), any(), any());
    }

    private static PortfolioTransaction tx(
            Long id, String symbol, PortfolioTransactionAction action, String quantity, LocalDate tradeDate) {
        return new PortfolioTransaction(id, PORTFOLIO_ID, USER_ID, symbol, PortfolioAssetType.US_STOCK, action,
                new BigDecimal(quantity), new BigDecimal("100"), "USD", BigDecimal.ZERO, BigDecimal.ONE, tradeDate,
                PortfolioTransactionSource.MANUAL, null, null, null);
    }
}
