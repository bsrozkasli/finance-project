package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioStateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface PortfolioStateJpaRepository extends JpaRepository<PortfolioStateEntity, Long> {

    Optional<PortfolioStateEntity> findByPortfolioIdAndUserIdAndVersion(Long portfolioId, String userId,
                                                                        String version);

    Optional<PortfolioStateEntity> findByPortfolioIdAndVersion(Long portfolioId, String version);

    /** Inserts the head row unless (portfolio, version) exists; returns 1 when inserted and 0 when it existed. */
    @Modifying
    @Query(value = "INSERT INTO portfolio_states (portfolio_id, user_id, version, as_of, base_currency, "
            + "exposure_status, created_at) VALUES (:portfolioId, :userId, :version, :asOf, :baseCurrency, "
            + ":exposureStatus, now()) ON CONFLICT (portfolio_id, version) DO NOTHING", nativeQuery = true)
    int insertIfAbsent(@Param("portfolioId") Long portfolioId, @Param("userId") String userId,
                       @Param("version") String version, @Param("asOf") LocalDate asOf,
                       @Param("baseCurrency") String baseCurrency, @Param("exposureStatus") String exposureStatus);
}
