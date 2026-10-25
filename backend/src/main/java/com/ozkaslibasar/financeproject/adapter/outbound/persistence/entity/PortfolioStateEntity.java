package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

/** Read model of {@code portfolio_states}; rows are inserted by the adapter's native insert and never updated. */
@Entity
@Table(name = "portfolio_states")
@Getter
@NoArgsConstructor
public class PortfolioStateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "portfolio_id", nullable = false, updatable = false)
    private Long portfolioId;

    @Column(name = "user_id", nullable = false, length = 64, updatable = false)
    private String userId;

    @Column(name = "version", nullable = false, length = 80, updatable = false)
    private String version;

    @Column(name = "as_of", nullable = false, updatable = false)
    private LocalDate asOf;

    @Column(name = "base_currency", nullable = false, length = 3, updatable = false)
    private String baseCurrency;

    @Column(name = "exposure_status", nullable = false, length = 16, updatable = false)
    private String exposureStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
