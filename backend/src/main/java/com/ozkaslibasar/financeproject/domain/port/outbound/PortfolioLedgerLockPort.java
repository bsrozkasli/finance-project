package com.ozkaslibasar.financeproject.domain.port.outbound;

import java.util.function.Supplier;

/**
 * Serializes ledger additions per portfolio (R-13). {@code work} runs while holding the portfolio's lock inside one
 * transaction; if it throws, everything it wrote is rolled back and the exception propagates. Additions to different
 * portfolios do not wait for each other.
 */
public interface PortfolioLedgerLockPort {

    <T> T withPortfolioLock(Long portfolioId, Supplier<T> work);
}
