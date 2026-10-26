package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioLedgerLockPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;

/** Builds a ledger service whose per-portfolio lock simply runs the work (single-threaded unit tests). */
final class LedgerTestSupport {

    private LedgerTestSupport() {
    }

    static final PortfolioLedgerLockPort PASS_THROUGH_LOCK = new PortfolioLedgerLockPort() {
        @Override
        public <T> T withPortfolioLock(Long portfolioId, java.util.function.Supplier<T> work) {
            return work.get();
        }
    };

    static PortfolioLedgerService ledger(PortfolioTransactionPort port) {
        return new PortfolioLedgerService(port, PASS_THROUGH_LOCK);
    }
}
