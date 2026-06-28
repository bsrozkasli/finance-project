package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioPositionEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.PortfolioPositionJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.PortfolioPosition;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPositionPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class PortfolioPositionRepositoryAdapter implements PortfolioPositionPort {

    private final PortfolioPositionJpaRepository jpaRepository;

    @Override
    public List<PortfolioPosition> findByUserId(String userId) {
        return jpaRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<PortfolioPosition> findByIdAndUserId(Long id, String userId) {
        return jpaRepository.findByIdAndUserId(id, userId).map(this::toDomain);
    }

    @Override
    public PortfolioPosition save(PortfolioPosition position) {
        PortfolioPositionEntity entity = toEntity(position);
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteByIdAndUserId(Long id, String userId) {
        jpaRepository.deleteByIdAndUserId(id, userId);
    }

    // ── mapping ──────────────────────────────────────────────────────────────────

    private PortfolioPosition toDomain(PortfolioPositionEntity e) {
        return new PortfolioPosition(
                e.getId(),
                e.getUserId(),
                e.getSymbol(),
                e.getQuantity(),
                e.getAvgCostPrice(),
                e.getOpenedAt(),
                e.getNotes(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }

    private PortfolioPositionEntity toEntity(PortfolioPosition p) {
        PortfolioPositionEntity e = new PortfolioPositionEntity();
        // only set id when updating (null for new records)
        if (p.id() != null) e.setId(p.id());
        e.setUserId(p.userId() != null ? p.userId() : "default");
        e.setSymbol(p.symbol().toUpperCase());
        e.setQuantity(p.quantity());
        e.setAvgCostPrice(p.avgCostPrice());
        e.setOpenedAt(p.openedAt());
        e.setNotes(p.notes());
        return e;
    }
}
