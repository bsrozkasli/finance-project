package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioTransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PortfolioTransactionJpaRepository extends JpaRepository<PortfolioTransactionEntity, Long> {

    List<PortfolioTransactionEntity> findByPortfolioIdAndUserIdOrderByTradeDateAscIdAsc(Long portfolioId, String userId);

    Optional<PortfolioTransactionEntity> findByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId);

    void deleteByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId);
}
