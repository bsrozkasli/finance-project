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

@Entity
@Table(name = "portfolio_state_events")
@IdClass(PortfolioStateEventEntity.Key.class)
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioStateEventEntity {

    @Id
    @Column(name = "state_id", nullable = false)
    private Long stateId;

    @Id
    @Column(name = "transaction_id", nullable = false)
    private Long transactionId;

    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private Long stateId;
        private Long transactionId;
    }
}
