package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "symbol_mapping")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SymbolMappingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "canonical_symbol", nullable = false, length = 40)
    private String canonicalSymbol;

    @Column(name = "provider", nullable = false, length = 40)
    private String provider;

    @Column(name = "provider_symbol", nullable = false, length = 80)
    private String providerSymbol;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "asset_type", nullable = false, length = 20)
    private String assetType;

    @Column(name = "exchange", length = 40)
    private String exchange;

    @Column(name = "currency", length = 10)
    private String currency;

    @Column(name = "priority", nullable = false)
    private int priority;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "last_failure_reason", length = 500)
    private String lastFailureReason;

    @Column(name = "last_resolved_at")
    private Instant lastResolvedAt;
}
