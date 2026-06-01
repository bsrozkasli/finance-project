package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.FinancialStatementEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link FinancialStatementEntity}.
 *
 * <p>Used exclusively by {@code FinancialStatementRepositoryAdapter}; never
 * referenced directly from domain or controller layers.</p>
 */
public interface FinancialStatementJpaRepository extends JpaRepository<FinancialStatementEntity, Long> {

    /**
     * Returns all statement records for a symbol, ordered newest first.
     */
    List<FinancialStatementEntity> findBySymbolOrderByFiscalYearDescPeriodDesc(String symbol);

    /**
     * Returns the single most recent record matching the given symbol and period type.
     */
    Optional<FinancialStatementEntity> findTopBySymbolAndPeriodOrderByFiscalYearDesc(
            String symbol, String period);

    /**
     * Used by the upsert check: returns existing record to decide insert vs update.
     */
    Optional<FinancialStatementEntity> findBySymbolAndFiscalYearAndPeriod(
            String symbol, Integer fiscalYear, String period);
}
