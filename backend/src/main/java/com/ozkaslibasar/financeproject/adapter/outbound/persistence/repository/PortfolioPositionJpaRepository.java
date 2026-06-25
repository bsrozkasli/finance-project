package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioPositionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PortfolioPositionJpaRepository extends JpaRepository<PortfolioPositionEntity, Long> {

    List<PortfolioPositionEntity> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<PortfolioPositionEntity> findByIdAndUserId(Long id, String userId);

    void deleteByIdAndUserId(Long id, String userId);
}
