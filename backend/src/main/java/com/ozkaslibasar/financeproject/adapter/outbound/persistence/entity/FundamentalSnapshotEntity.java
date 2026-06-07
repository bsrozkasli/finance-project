package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * JPA Entity for persisting {@link com.ozkaslibasar.financeproject.domain.model.FundamentalSnapshot}.
 *
 * <p>This table is treated as append-only (immutable). Each time the background job
 * calculates new metrics, a new row is inserted with the current timestamp.</p>
 */
@Entity
@Table(
        name = "fundamental_snapshots",
        indexes = {
                @Index(name = "idx_fundamental_snapshots_symbol", columnList = "symbol, calculated_at DESC")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FundamentalSnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String symbol;

    @Column(name = "calculated_at", nullable = false)
    private Instant calculatedAt;

    @Column(name = "fiscal_year", length = 10)
    private String fiscalYear;

    @Column(precision = 19, scale = 4)
    private BigDecimal roa;

    @Column(precision = 19, scale = 4)
    private BigDecimal roe;

    @Column(precision = 19, scale = 4)
    private BigDecimal roic;

    @Column(name = "current_ratio", precision = 19, scale = 4)
    private BigDecimal currentRatio;

    @Column(name = "debt_to_equity", precision = 19, scale = 4)
    private BigDecimal debtToEquity;

    @Column(name = "ev_fcf", precision = 19, scale = 4)
    private BigDecimal evFcf;

    @Column(name = "piotroski_score")
    private Integer piotroskiScore;

    @Column(name = "piotroski_signals_json", columnDefinition = "TEXT")
    private String piotroskiSignalsJson;
}
