package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "research_evidence_snapshots")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResearchEvidenceSnapshotEntity {

    @Id
    @Column(name = "id")
    private UUID id;

    @Column(name = "previous_id")
    private UUID previousId;

    @Column(name = "revision", nullable = false)
    private long revision;

    @Column(name = "symbol", nullable = false, length = 40)
    private String symbol;

    @Column(name = "asset_type", nullable = false, length = 20)
    private String assetType;

    @Column(name = "listing_status", nullable = false, length = 20)
    private String listingStatus;

    @Column(name = "classification_basis", nullable = false, length = 30)
    private String classificationBasis;

    @Column(name = "identity_source", nullable = false, length = 80)
    private String identitySource;

    @Column(name = "identity_retrieved_at", nullable = false)
    private Instant identityRetrievedAt;

    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt;
}
