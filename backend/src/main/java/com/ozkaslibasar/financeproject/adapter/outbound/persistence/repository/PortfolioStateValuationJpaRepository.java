package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioStateValuationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PortfolioStateValuationJpaRepository
        extends JpaRepository<PortfolioStateValuationEntity, PortfolioStateValuationEntity.Key> {

    List<PortfolioStateValuationEntity> findByStateIdOrderBySymbolAsc(Long stateId);
}
