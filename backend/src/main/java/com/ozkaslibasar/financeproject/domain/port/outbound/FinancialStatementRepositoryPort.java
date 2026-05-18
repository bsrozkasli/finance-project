package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;

import java.util.List;
import java.util.Optional;

/**
 * Outbound port — contract for persisting and retrieving {@link FinancialStatement} records.
 *
 * <p>Implementations live in the {@code adapter/outbound/persistence} layer.
 * The domain layer depends only on this interface, never on JPA or any ORM.</p>
 */
public interface FinancialStatementRepositoryPort {

    /**
     * Bulk-saves a list of financial statement records.
     *
     * <p>Implementations should perform an upsert keyed on
     * {@code (symbol, fiscalYear, period)} to ensure idempotency
     * of the ingestion job.</p>
     *
     * @param statements the list of records to persist; ignored if empty
     */
    void saveAll(List<FinancialStatement> statements);

    /**
     * Retrieves all financial statement records for the given symbol.
     *
     * @param symbol the ticker symbol (e.g. {@code "AAPL"})
     * @return a list ordered by fiscalYear descending then period; never {@code null}
     */
    List<FinancialStatement> findBySymbol(String symbol);

    /**
     * Returns the most recent financial statement for a given symbol and period type.
     *
     * @param symbol the ticker symbol
     * @param period the period type (e.g. {@code "annual"}, {@code "Q1"})
     * @return an {@link Optional} with the latest record, or empty if none exists
     */
    Optional<FinancialStatement> findLatest(String symbol, String period);
}
