package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PortfolioJpaRepository extends JpaRepository<PortfolioEntity, Long> {

    List<PortfolioEntity> findByUserIdOrderByDefaultPortfolioDescNameAsc(String userId);

    Optional<PortfolioEntity> findByIdAndUserId(Long id, String userId);

    void deleteByIdAndUserId(Long id, String userId);
}
