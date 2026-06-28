package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.OpportunityNotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OpportunityNotificationJpaRepository extends JpaRepository<OpportunityNotificationEntity, Long> {
    List<OpportunityNotificationEntity> findAllByOrderByCreatedAtDesc();
    List<OpportunityNotificationEntity> findByIsReadFalseOrderByCreatedAtDesc();
}
