package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "portfolio_state_valuations")
@IdClass(PortfolioStateValuationEntity.Key.class)
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioStateValuationEntity {

    @Id
    @Column(name = "state_id", nullable = false)
    private Long stateId;

    @Id
    @Column(name = "symbol", nullable = false, length = 40)
    private String symbol;

    @Column(name = "close", precision = 24, scale = 8)
    private BigDecimal close;

    @Column(name = "price_date")
    private LocalDate priceDate;

    @Column(name = "price_currency", length = 10)
    private String priceCurrency;

    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private Long stateId;
        private String symbol;
    }
}
