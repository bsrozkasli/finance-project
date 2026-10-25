package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.ResearchEvidenceSnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResearchEvidenceSnapshotJpaRepository extends JpaRepository<ResearchEvidenceSnapshotEntity, UUID> {

    Optional<ResearchEvidenceSnapshotEntity> findFirstBySymbolOrderByRevisionDesc(String symbol);
}
