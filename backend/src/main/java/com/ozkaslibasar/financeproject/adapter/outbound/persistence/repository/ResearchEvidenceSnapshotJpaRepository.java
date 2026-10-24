package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.ResearchEvidenceSnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResearchEvidenceSnapshotJpaRepository extends JpaRepository<ResearchEvidenceSnapshotEntity, String> {

    Optional<ResearchEvidenceSnapshotEntity> findFirstBySymbolOrderByRevisionDesc(String symbol);
}
