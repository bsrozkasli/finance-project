package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/** R-18: the lock's correctness depends on READ COMMITTED, so the adapter must pin it rather than inherit it. */
class PortfolioLedgerLockAdapterTest {

    @Test
    void pinsTheLockTransactionToReadCommitted() {
        PortfolioLedgerLockAdapter adapter = new PortfolioLedgerLockAdapter(mock(PlatformTransactionManager.class));

        TransactionTemplate template = (TransactionTemplate) ReflectionTestUtils.getField(adapter, "transactionTemplate");

        assertThat(template).isNotNull();
        assertThat(template.getIsolationLevel()).isEqualTo(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }
}
