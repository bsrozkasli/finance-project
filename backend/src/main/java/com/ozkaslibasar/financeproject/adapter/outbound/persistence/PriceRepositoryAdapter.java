package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.mapper.PricePersistenceMapper;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.PriceJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Adapter implementing {@link PriceRepositoryPort} using Spring Data JPA.
 */
@Repository
@RequiredArgsConstructor
public class PriceRepositoryAdapter implements PriceRepositoryPort {

    private final PriceJpaRepository repository;
    private final PricePersistenceMapper mapper;

    @Override
    public List<PriceHistory> findByAssetIdAndPeriod(String assetId, Instant from, Instant to) {
        var entities = repository.findByAssetIdAndTimestampBetweenOrderByTimestampAsc(assetId, from, to);
        return mapper.toDomainList(entities);
    }

    @Override
    public Optional<PriceHistory> findLatestByAssetId(String assetId) {
        return repository.findLatestByAssetId(assetId)
                .map(mapper::toDomain);
    }

    @Override
    @Transactional
    public void saveAll(List<PriceHistory> prices) {
        if (prices == null || prices.isEmpty()) {
            return;
        }
        
        // In a real-world scenario we might need an upsert using native query.
        // For Phase 1 we will rely on saving new entities and ignoring constraint violations
        // or checking for existing entities. Since this is an adapter to DB, 
        // a simple saveAll handles insertion.
        var entities = mapper.toEntityList(prices);
        repository.saveAll(entities);
    }
}
