package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.mapper.PricePersistenceMapper;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.PriceJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import io.micrometer.core.instrument.MeterRegistry;
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
    private final MeterRegistry meterRegistry;

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
        var entities = mapper.toEntityList(prices);
        for (var entity : entities) {
            repository.upsertPrice(
                    entity.getAssetId(),
                    entity.getOpen(),
                    entity.getClose(),
                    entity.getHigh(),
                    entity.getLow(),
                    entity.getVolume(),
                    entity.getTimestamp()
            );
        }
    }
}

