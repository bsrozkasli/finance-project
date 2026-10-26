package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.StoredPortfolioState;

import java.util.Optional;

/** Append-only store of Portfolio States; a stored state is never updated or deleted. */
public interface PortfolioStatePort {

    Optional<StoredPortfolioState> findByVersion(Long portfolioId, String userId, String version);

    /** Stores the state unless that (portfolio, version) exists; returns the stored row and whether it was created. */
    SaveResult saveIfAbsent(StoredPortfolioState state);

    record SaveResult(StoredPortfolioState stored, boolean created) {
    }
}
