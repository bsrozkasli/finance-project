package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioTransactionEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.PortfolioTransactionJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.service.DuplicateOriginLocatorException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class PortfolioTransactionRepositoryAdapter implements PortfolioTransactionPort {

    private final PortfolioTransactionJpaRepository jpaRepository;

    @Override
    public List<PortfolioTransaction> findByPortfolioIdAndUserId(Long portfolioId, String userId) {
        return jpaRepository.findByPortfolioIdAndUserIdAndVoidedAtIsNullOrderByTradeDateAscIdAsc(portfolioId, userId)
                .stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public Optional<PortfolioTransaction> findByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId) {
        return jpaRepository.findByIdAndPortfolioIdAndUserIdAndVoidedAtIsNull(id, portfolioId, userId).map(this::toDomain);
    }

    @Override
    public PortfolioTransaction save(PortfolioTransaction transaction) {
        try {
            return toDomain(jpaRepository.save(toEntity(transaction)));
        } catch (DataIntegrityViolationException e) {
            // Deliberately not @Transactional: called on its own, the failed insert has already rolled back its own
            // transaction. Only a CSV identity clash is reported as such. (Ledger additions check the locator under
            // the portfolio lock first, so inside that transaction this branch is not expected; if the transaction
            // is already aborted the follow-up read fails and the original violation is rethrown.)
            if (transaction.source() == PortfolioTransactionSource.CSV && transaction.originLocator() != null
                    && csvLocatorExists(transaction)) {
                throw new DuplicateOriginLocatorException(transaction.originLocator());
            }
            throw e;
        }
    }

    private boolean csvLocatorExists(PortfolioTransaction transaction) {
        try {
            return existsBySourceAndOriginLocator(transaction.source(), transaction.originLocator());
        } catch (RuntimeException readFailure) {
            return false;
        }
    }

    @Override
    public Optional<PortfolioTransaction> findActiveBySourceAndOriginLocator(PortfolioTransactionSource source,
                                                                             String originLocator) {
        return jpaRepository.findBySourceAndOriginLocatorAndVoidedAtIsNull(source, originLocator).map(this::toDomain);
    }

    @Override
    public boolean existsBySourceAndOriginLocator(PortfolioTransactionSource source, String originLocator) {
        return jpaRepository.existsBySourceAndOriginLocator(source, originLocator);
    }

    @Override
    @Transactional
    public void voidByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId, Instant voidedAt) {
        jpaRepository.voidActive(id, portfolioId, userId, voidedAt);
    }

    @Override
    public List<PortfolioTransaction> findByIdsIncludingVoided(Long portfolioId, String userId, Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findByPortfolioIdAndUserIdAndIdInOrderByTradeDateAscIdAsc(portfolioId, userId, ids)
                .stream()
                .map(this::toDomain)
                .toList();
    }

    private PortfolioTransaction toDomain(PortfolioTransactionEntity e) {
        return new PortfolioTransaction(
                e.getId(),
                e.getPortfolioId(),
                e.getUserId(),
                e.getSymbol(),
                e.getAssetType(),
                e.getAction(),
                e.getQuantity(),
                e.getPrice(),
                e.getCurrency(),
                e.getFee(),
                e.getFxRateToBase(),
                e.getTradeDate(),
                e.getSource(),
                e.getNotes(),
                e.getCreatedAt(),
                e.getUpdatedAt(),
                e.getOriginLocator(),
                e.getVoidedAt());
    }

    private PortfolioTransactionEntity toEntity(PortfolioTransaction transaction) {
        PortfolioTransactionEntity e = new PortfolioTransactionEntity();
        if (transaction.id() != null) {
            e.setId(transaction.id());
        }
        e.setPortfolioId(transaction.portfolioId());
        e.setUserId(transaction.userId());
        e.setSymbol(transaction.symbol());
        e.setAssetType(transaction.assetType());
        e.setAction(transaction.action());
        e.setQuantity(transaction.quantity());
        e.setPrice(transaction.price());
        e.setCurrency(transaction.currency());
        e.setFee(transaction.fee());
        e.setFxRateToBase(transaction.fxRateToBase());
        e.setTradeDate(transaction.tradeDate());
        e.setSource(transaction.source());
        e.setOriginLocator(transaction.originLocator());
        e.setVoidedAt(transaction.voidedAt());
        e.setNotes(transaction.notes());
        return e;
    }
}
