package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioLedgerLockPort;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.function.Supplier;

/**
 * Runs the work in one transaction that first locks the portfolio row ({@code SELECT ... FOR UPDATE}), so ledger
 * additions to the same portfolio queue up while other portfolios are unaffected (R-13). The repository calls made by
 * the work join this transaction; an exception rolls the whole unit back.
 */
@Component
public class PortfolioLedgerLockAdapter implements PortfolioLedgerLockPort {

    private final TransactionTemplate transactionTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    public PortfolioLedgerLockAdapter(PlatformTransactionManager transactionManager) {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        // The lock's correctness depends on READ COMMITTED (R-18): a waiter must see the committed insert or void it
        // waited for. Under REPEATABLE READ its snapshot would predate the lock and it could validate stale events.
        this.transactionTemplate.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    @Override
    public <T> T withPortfolioLock(Long portfolioId, Supplier<T> work) {
        return transactionTemplate.execute(status -> {
            entityManager.createNativeQuery("SELECT id FROM portfolios WHERE id = :id FOR UPDATE")
                    .setParameter("id", portfolioId)
                    .getResultList();
            return work.get();
        });
    }
}
