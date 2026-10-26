package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import com.ozkaslibasar.financeproject.domain.model.CsvImportRowStatus;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "portfolio_csv_import_rows")
@Getter
@Setter
@NoArgsConstructor
public class CsvImportRowEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false, updatable = false)
    private Long batchId;

    @Column(name = "row_number", nullable = false, updatable = false)
    private int rowNumber;

    @Column(name = "raw_line", nullable = false, updatable = false, columnDefinition = "TEXT")
    private String rawLine;

    @Column(name = "origin_locator", length = 128, updatable = false)
    private String originLocator;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private CsvImportRowStatus status;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "trade_date", updatable = false)
    private LocalDate tradeDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", length = 32, updatable = false)
    private PortfolioTransactionAction action;

    @Column(name = "symbol", length = 32, updatable = false)
    private String symbol;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_type", length = 32, updatable = false)
    private PortfolioAssetType assetType;

    @Column(name = "quantity", precision = 24, scale = 8, updatable = false)
    private BigDecimal quantity;

    @Column(name = "price", precision = 24, scale = 8, updatable = false)
    private BigDecimal price;

    @Column(name = "currency", length = 3, updatable = false)
    private String currency;

    @Column(name = "fee", precision = 24, scale = 8, updatable = false)
    private BigDecimal fee;

    @Column(name = "fx_rate_to_base", precision = 24, scale = 10, updatable = false)
    private BigDecimal fxRateToBase;

    @Column(name = "notes", length = 1000, updatable = false)
    private String notes;

    @Column(name = "transaction_id")
    private Long transactionId;
}
