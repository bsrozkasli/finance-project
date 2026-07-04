package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.JournalTradeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JournalTradeJpaRepository extends JpaRepository<JournalTradeEntity, Long> {

    List<JournalTradeEntity> findByUserIdOrderByOpenedAtDescIdDesc(String userId);

    Optional<JournalTradeEntity> findByIdAndUserId(Long id, String userId);

    void deleteByIdAndUserId(Long id, String userId);

    void deleteByPortfolioIdAndTransactionIdAndUserId(Long portfolioId, Long transactionId, String userId);
}
