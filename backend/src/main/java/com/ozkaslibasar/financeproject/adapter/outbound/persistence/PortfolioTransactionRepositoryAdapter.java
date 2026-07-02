package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioTransactionEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.PortfolioTransactionJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class PortfolioTransactionRepositoryAdapter implements PortfolioTransactionPort {

    private final PortfolioTransactionJpaRepository jpaRepository;

    @Override
    public List<PortfolioTransaction> findByPortfolioIdAndUserId(Long portfolioId, String userId) {
        return jpaRepository.findByPortfolioIdAndUserIdOrderByTradeDateAscIdAsc(portfolioId, userId)
                .stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public Optional<PortfolioTransaction> findByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId) {
        return jpaRepository.findByIdAndPortfolioIdAndUserId(id, portfolioId, userId).map(this::toDomain);
    }

    @Override
    public PortfolioTransaction save(PortfolioTransaction transaction) {
        return toDomain(jpaRepository.save(toEntity(transaction)));
    }

    @Override
    @Transactional
    public void deleteByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId) {
        jpaRepository.deleteByIdAndPortfolioIdAndUserId(id, portfolioId, userId);
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
                e.getUpdatedAt());
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
        e.setNotes(transaction.notes());
        return e;
    }
}
