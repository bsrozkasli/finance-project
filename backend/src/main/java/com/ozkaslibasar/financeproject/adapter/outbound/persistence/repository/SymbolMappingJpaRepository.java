package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.SymbolMappingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface SymbolMappingJpaRepository extends JpaRepository<SymbolMappingEntity, Long> {

    Optional<SymbolMappingEntity> findFirstByCanonicalSymbolAndProviderAndStatusInOrderByPriorityAsc(
            String canonicalSymbol,
            String provider,
            Collection<String> statuses);
}
