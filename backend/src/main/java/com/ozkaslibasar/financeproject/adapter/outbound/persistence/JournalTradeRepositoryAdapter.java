package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.JournalTradeEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.JournalTradeJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.JournalTrade;
import com.ozkaslibasar.financeproject.domain.port.outbound.JournalTradePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JournalTradeRepositoryAdapter implements JournalTradePort {

    private final JournalTradeJpaRepository jpaRepository;

    @Override
    public List<JournalTrade> findByUserId(String userId) {
        return jpaRepository.findByUserIdOrderByOpenedAtDescIdDesc(userId)
                .stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public Optional<JournalTrade> findByIdAndUserId(Long id, String userId) {
        return jpaRepository.findByIdAndUserId(id, userId).map(this::toDomain);
    }

    @Override
    public JournalTrade save(JournalTrade trade) {
        return toDomain(jpaRepository.save(toEntity(trade)));
    }

    @Override
    @Transactional
    public void deleteByIdAndUserId(Long id, String userId) {
        jpaRepository.deleteByIdAndUserId(id, userId);
    }

    private JournalTrade toDomain(JournalTradeEntity e) {
        return new JournalTrade(
                e.getId(),
                e.getUserId(),
                e.getSymbol(),
                e.getCompany(),
                e.getType(),
                e.getQuantity(),
                e.getPurchasePrice(),
                e.getCurrentPrice(),
                e.getMarketValue(),
                e.getCommission(),
                e.getStrategy(),
                e.getNotes(),
                List.copyOf(e.getTags()),
                e.getOpenedAt(),
                e.getClosedAt(),
                e.getStatus(),
                e.getPnl(),
                e.getReturnPct(),
                e.getHoldingDays(),
                e.getPortfolioId(),
                e.getTransactionId(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }

    private JournalTradeEntity toEntity(JournalTrade trade) {
        JournalTradeEntity e = new JournalTradeEntity();
        if (trade.id() != null) {
            e.setId(trade.id());
        }
        e.setUserId(trade.userId());
        e.setSymbol(trade.symbol());
        e.setPortfolioId(trade.portfolioId());
        e.setTransactionId(trade.transactionId());
        e.setCompany(trade.company());
        e.setType(trade.type());
        e.setQuantity(trade.quantity());
        e.setPurchasePrice(trade.purchasePrice());
        e.setCurrentPrice(trade.currentPrice());
        e.setMarketValue(trade.marketValue());
        e.setCommission(trade.commission());
        e.setStrategy(trade.strategy());
        e.setNotes(trade.notes());
        e.setTags(trade.tags());
        e.setOpenedAt(trade.openedAt());
        e.setClosedAt(trade.closedAt());
        e.setStatus(trade.status());
        e.setPnl(trade.pnl());
        e.setReturnPct(trade.returnPct());
        e.setHoldingDays(trade.holdingDays());
        return e;
    }
}
