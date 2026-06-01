package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.mapper.FinancialStatementPersistenceMapper;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.FinancialStatementJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialStatementRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Adapter implementing {@link FinancialStatementRepositoryPort} using Spring Data JPA.
 *
 * <p>The {@code saveAll} method performs an upsert: for each statement it checks
 * whether a record with the same {@code (symbol, fiscalYear, period)} already exists
 * and reuses its {@code id} to trigger an UPDATE rather than an INSERT.
 * This guarantees idempotency of the nightly ingestion job.</p>
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class FinancialStatementRepositoryAdapter implements FinancialStatementRepositoryPort {

    private final FinancialStatementJpaRepository jpaRepository;
    private final FinancialStatementPersistenceMapper mapper;

    /**
     * {@inheritDoc}
     *
     * <p>Performs an upsert per record: checks existing row by natural key
     * and carries its {@code id} into the new entity before saving.</p>
     */
    @Override
    public void saveAll(List<FinancialStatement> statements) {
        if (statements.isEmpty()) {
            return;
        }
        var entities = statements.stream()
                .map(domain -> {
                    var entity = mapper.toEntity(domain);
                    // Upsert: reuse existing id if present to perform UPDATE
                    jpaRepository.findBySymbolAndFiscalYearAndPeriod(
                                    domain.symbol(), domain.fiscalYear(), domain.period())
                            .ifPresent(existing -> entity.setId(existing.getId()));
                    return entity;
                })
                .collect(Collectors.toList());
        jpaRepository.saveAll(entities);
        log.info("Upserted {} financial statement record(s)", entities.size());
    }

    /** {@inheritDoc} */
    @Override
    public List<FinancialStatement> findBySymbol(String symbol) {
        return jpaRepository.findBySymbolOrderByFiscalYearDescPeriodDesc(symbol)
                .stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public Optional<FinancialStatement> findLatest(String symbol, String period) {
        return jpaRepository.findTopBySymbolAndPeriodOrderByFiscalYearDesc(symbol, period)
                .map(mapper::toDomain);
    }
}
