package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "research_evidence_snapshots")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResearchEvidenceSnapshotEntity {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "symbol", nullable = false, length = 40)
    private String symbol;

    @Column(name = "revision", nullable = false)
    private int revision;

    @Column(name = "supersedes_id", length = 64)
    private String supersedesId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
