package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.AgentAnalysisHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentAnalysisHistoryJpaRepository extends JpaRepository<AgentAnalysisHistoryEntity, Long> {
}
