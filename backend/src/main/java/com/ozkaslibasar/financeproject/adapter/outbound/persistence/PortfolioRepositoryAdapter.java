package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.PortfolioJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class PortfolioRepositoryAdapter implements PortfolioPort {

    private final PortfolioJpaRepository jpaRepository;

    @Override
    public List<Portfolio> findByUserId(String userId) {
        return jpaRepository.findByUserIdOrderByDefaultPortfolioDescNameAsc(userId)
                .stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public Optional<Portfolio> findByIdAndUserId(Long id, String userId) {
        return jpaRepository.findByIdAndUserId(id, userId).map(this::toDomain);
    }

    @Override
    public Portfolio save(Portfolio portfolio) {
        return toDomain(jpaRepository.save(toEntity(portfolio)));
    }

    @Override
    @Transactional
    public void deleteByIdAndUserId(Long id, String userId) {
        jpaRepository.deleteByIdAndUserId(id, userId);
    }

    private Portfolio toDomain(PortfolioEntity e) {
        return new Portfolio(
                e.getId(),
                e.getUserId(),
                e.getName(),
                e.getBaseCurrency(),
                e.getDescription(),
                e.isDefaultPortfolio(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }

    private PortfolioEntity toEntity(Portfolio portfolio) {
        PortfolioEntity e = new PortfolioEntity();
        if (portfolio.id() != null) {
            e.setId(portfolio.id());
        }
        e.setUserId(portfolio.userId());
        e.setName(portfolio.name());
        e.setBaseCurrency(portfolio.baseCurrency());
        e.setDescription(portfolio.description());
        e.setDefaultPortfolio(portfolio.defaultPortfolio());
        return e;
    }
}
