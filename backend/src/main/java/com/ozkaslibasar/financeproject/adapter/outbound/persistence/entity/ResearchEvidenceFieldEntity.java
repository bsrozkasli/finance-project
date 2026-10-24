package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "research_evidence_fields")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResearchEvidenceFieldEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "snapshot_id", nullable = false, length = 64)
    private String snapshotId;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "name", nullable = false, length = 80)
    private String name;

    @Column(name = "value", columnDefinition = "TEXT")
    private String value;

    @Column(name = "missingness", nullable = false, length = 20)
    private String missingness;

    @Column(name = "source", nullable = false, length = 80)
    private String source;

    @Column(name = "observed_at")
    private Instant observedAt;

    @Column(name = "retrieved_at", nullable = false)
    private Instant retrievedAt;

    @Column(name = "period", length = 40)
    private String period;

    @Column(name = "currency", length = 10)
    private String currency;

    @Column(name = "normalization", length = 80)
    private String normalization;

    @Column(name = "freshness", nullable = false, length = 20)
    private String freshness;

    @Column(name = "conflicted", nullable = false)
    private boolean conflicted;
}
