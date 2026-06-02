package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * JPA Entity representing a historical price record in the database.
 */
@Entity
@Table(
    name = "price_history",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_asset_timestamp", columnNames = {"asset_id", "price_timestamp"})
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_id", nullable = false, length = 20)
    private String assetId;

    @Column(name = "open_price", nullable = false, precision = 19, scale = 4)
    private BigDecimal open;

    @Column(name = "close_price", nullable = false, precision = 19, scale = 4)
    private BigDecimal close;

    @Column(name = "high_price", nullable = false, precision = 19, scale = 4)
    private BigDecimal high;

    @Column(name = "low_price", nullable = false, precision = 19, scale = 4)
    private BigDecimal low;

    @Column(name = "volume", nullable = false, precision = 19, scale = 4)
    private BigDecimal volume;

    @Column(name = "price_timestamp", nullable = false)
    private Instant timestamp;
}
