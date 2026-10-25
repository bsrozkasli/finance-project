package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioTransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PortfolioTransactionJpaRepository extends JpaRepository<PortfolioTransactionEntity, Long> {

    List<PortfolioTransactionEntity> findByPortfolioIdAndUserIdAndVoidedAtIsNullOrderByTradeDateAscIdAsc(
            Long portfolioId, String userId);

    Optional<PortfolioTransactionEntity> findByIdAndPortfolioIdAndUserIdAndVoidedAtIsNull(
            Long id, Long portfolioId, String userId);

    List<PortfolioTransactionEntity> findByPortfolioIdAndUserIdAndIdInOrderByTradeDateAscIdAsc(
            Long portfolioId, String userId, Collection<Long> ids);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE PortfolioTransactionEntity t SET t.voidedAt = :voidedAt
            WHERE t.id = :id AND t.portfolioId = :portfolioId AND t.userId = :userId AND t.voidedAt IS NULL
            """)
    int voidActive(@Param("id") Long id, @Param("portfolioId") Long portfolioId,
                   @Param("userId") String userId, @Param("voidedAt") Instant voidedAt);
}
