package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.FundamentalSnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FundamentalSnapshotJpaRepository extends JpaRepository<FundamentalSnapshotEntity, Long> {

    List<FundamentalSnapshotEntity> findBySymbolOrderByCalculatedAtDesc(String symbol);

    Optional<FundamentalSnapshotEntity> findFirstBySymbolOrderByCalculatedAtDesc(String symbol);
}
