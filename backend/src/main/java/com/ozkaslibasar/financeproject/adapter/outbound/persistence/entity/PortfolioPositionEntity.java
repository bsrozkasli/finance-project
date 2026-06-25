package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity for a portfolio position row in {@code portfolio_positions}.
 * Hibernate creates / updates this table automatically via {@code ddl-auto: update}.
 */
@Entity
@Table(name = "portfolio_positions")
@Getter
@Setter
@NoArgsConstructor
public class PortfolioPositionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Owner identifier — "default" until multi-user auth is added. */
    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(name = "symbol", nullable = false, length = 16)
    private String symbol;

    @Column(name = "quantity", nullable = false, precision = 18, scale = 6)
    private BigDecimal quantity;

    @Column(name = "avg_cost_price", nullable = false, precision = 18, scale = 6)
    private BigDecimal avgCostPrice;

    @Column(name = "opened_at")
    private LocalDate openedAt;

    @Column(name = "notes", length = 500)
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
