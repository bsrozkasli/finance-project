package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import com.ozkaslibasar.financeproject.domain.model.JournalTradeStatus;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "journal_trades")
@Getter
@Setter
@NoArgsConstructor
public class JournalTradeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(name = "symbol", nullable = false, length = 16)
    private String symbol;

    @Column(name = "portfolio_id")
    private Long portfolioId;

    @Column(name = "transaction_id")
    private Long transactionId;

    @Column(name = "company", nullable = false, length = 128)
    private String company;

    @Enumerated(EnumType.STRING)
    @Column(name = "trade_type", nullable = false, length = 16)
    private JournalTradeType type;

    @Column(name = "quantity", nullable = false, precision = 18, scale = 6)
    private BigDecimal quantity;

    @Column(name = "purchase_price", nullable = false, precision = 18, scale = 6)
    private BigDecimal purchasePrice;

    @Column(name = "current_price", nullable = false, precision = 18, scale = 6)
    private BigDecimal currentPrice;

    @Column(name = "market_value", nullable = false, precision = 18, scale = 6)
    private BigDecimal marketValue;

    @Column(name = "commission", nullable = false, precision = 18, scale = 6)
    private BigDecimal commission;

    @Column(name = "strategy", length = 128)
    private String strategy;

    @Column(name = "notes", length = 1000)
    private String notes;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "journal_trade_tags", joinColumns = @JoinColumn(name = "trade_id"))
    @OrderColumn(name = "tag_order")
    @Column(name = "tag", length = 64)
    private List<String> tags = new ArrayList<>();

    @Column(name = "opened_at", nullable = false)
    private LocalDate openedAt;

    @Column(name = "closed_at")
    private LocalDate closedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private JournalTradeStatus status;

    @Column(name = "pnl", nullable = false, precision = 18, scale = 6)
    private BigDecimal pnl;

    @Column(name = "return_pct", nullable = false, precision = 18, scale = 6)
    private BigDecimal returnPct;

    @Column(name = "holding_days", nullable = false)
    private Long holdingDays;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
