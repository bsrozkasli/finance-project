package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * JPA Entity representing an Asset in the database.
 */
@Entity
@Table(name = "assets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetEntity {

    @Id
    @Column(name = "symbol", nullable = false, unique = true, length = 20)
    private String symbol;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "exchange", length = 40)
    private String exchange;

    @Column(name = "currency", length = 10)
    private String currency;

    @Column(name = "provider", length = 40)
    private String provider;

    @Column(name = "provider_symbol", length = 40)
    private String providerSymbol;

    @Column(name = "metadata_status", nullable = false, length = 20)
    private String metadataStatus;
}
