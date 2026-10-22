package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioTransactionEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.PortfolioTransactionJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PortfolioTransactionRepositoryAdapterTest {
    // Mock rationale: JPA repository is the database I/O boundary; real adapter mapping is exercised.
    @Mock
    private PortfolioTransactionJpaRepository repository;

    @Test
    void shouldPreserveAcceptedManualLineageAfterAdapterRecreation() {
        PortfolioTransaction input = new PortfolioTransaction(null, 1L, "default", "AAPL",
                PortfolioAssetType.US_STOCK, PortfolioTransactionAction.BUY,
                BigDecimal.ONE, new BigDecimal("100"), "USD", BigDecimal.ZERO,
                BigDecimal.ONE, LocalDate.of(2026, 6, 1), PortfolioTransactionSource.MANUAL,
                "manual entry", null, null);
        String originalLocator = input.originLocator();
        AtomicReference<PortfolioTransactionEntity> stored = new AtomicReference<>();
        when(repository.save(any())).thenAnswer(invocation -> {
            PortfolioTransactionEntity entity = invocation.getArgument(0);
            entity.setId(42L);
            stored.set(entity);
            return entity;
        });
        PortfolioTransaction saved = new PortfolioTransactionRepositoryAdapter(repository).save(input);
        when(repository.findByIdAndPortfolioIdAndUserId(42L, 1L, "default"))
                .thenAnswer(invocation -> Optional.of(stored.get()));
        when(repository.findByPortfolioIdAndUserIdOrderByTradeDateAscIdAsc(1L, "default"))
                .thenAnswer(invocation -> List.of(stored.get()));

        PortfolioTransactionRepositoryAdapter recreated = new PortfolioTransactionRepositoryAdapter(repository);
        PortfolioTransaction readBack = recreated.findByIdAndPortfolioIdAndUserId(42L, 1L, "default").orElseThrow();
        PortfolioTransaction listed = recreated.findByPortfolioIdAndUserId(1L, "default").get(0);

        assertThat(stored.get().getOriginLocator()).isEqualTo(originalLocator);
        for (PortfolioTransaction transaction : List.of(saved, readBack, listed)) {
            assertThat(transaction.id()).isEqualTo(42L);
            assertThat(transaction.source()).isEqualTo(PortfolioTransactionSource.MANUAL);
            assertThat(transaction.originLocator()).isEqualTo(originalLocator);
        }
    }
}
