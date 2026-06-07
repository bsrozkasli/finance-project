package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "agent_analysis_history")
@Getter
@Setter
@NoArgsConstructor
public class AgentAnalysisHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 32)
    private String ticker;

    @Column(nullable = false, length = 16)
    private String decision;

    @Column(nullable = false)
    private int confidence;

    @Column(name = "analysis_json", nullable = false, columnDefinition = "TEXT")
    private String analysisJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
