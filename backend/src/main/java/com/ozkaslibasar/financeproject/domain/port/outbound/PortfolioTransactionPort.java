package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PortfolioTransactionPort {

    /** Active (not voided) events only. */
    List<PortfolioTransaction> findByPortfolioIdAndUserId(Long portfolioId, String userId);

    Optional<PortfolioTransaction> findByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId);

    PortfolioTransaction save(PortfolioTransaction transaction);

    /** Marks an active event voided once; an unknown or already voided event is left unchanged. */
    void voidByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId, Instant voidedAt);

    /** Returns the requested events whether active or voided, for replaying stored states. */
    List<PortfolioTransaction> findByIdsIncludingVoided(Long portfolioId, String userId, Collection<Long> ids);
}
