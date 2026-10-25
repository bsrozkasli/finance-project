package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.ResearchEvidenceFieldEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ResearchEvidenceFieldJpaRepository extends JpaRepository<ResearchEvidenceFieldEntity, Long> {

    List<ResearchEvidenceFieldEntity> findBySnapshotIdOrderByPositionAsc(UUID snapshotId);
}
