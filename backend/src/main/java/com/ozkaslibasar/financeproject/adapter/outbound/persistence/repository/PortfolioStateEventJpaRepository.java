package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioStateEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PortfolioStateEventJpaRepository
        extends JpaRepository<PortfolioStateEventEntity, PortfolioStateEventEntity.Key> {

    List<PortfolioStateEventEntity> findByStateIdOrderByTransactionIdAsc(Long stateId);
}
