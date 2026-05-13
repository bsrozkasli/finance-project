package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PriceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for {@link PriceEntity}.
 */
@Repository
public interface PriceJpaRepository extends JpaRepository<PriceEntity, Long> {

    List<PriceEntity> findByAssetIdAndTimestampBetweenOrderByTimestampAsc(String assetId, Instant from, Instant to);

    @Query("SELECT p FROM PriceEntity p WHERE p.assetId = :assetId ORDER BY p.timestamp DESC LIMIT 1")
    Optional<PriceEntity> findLatestByAssetId(@Param("assetId") String assetId);
}
