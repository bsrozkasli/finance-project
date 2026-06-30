package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;

import java.util.List;
import java.util.Optional;

public interface PortfolioTransactionPort {

    List<PortfolioTransaction> findByPortfolioIdAndUserId(Long portfolioId, String userId);

    Optional<PortfolioTransaction> findByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId);

    PortfolioTransaction save(PortfolioTransaction transaction);

    void deleteByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId);
}
