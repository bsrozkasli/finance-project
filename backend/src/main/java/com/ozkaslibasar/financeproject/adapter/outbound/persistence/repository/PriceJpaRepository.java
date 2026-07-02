package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PriceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
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

    @Modifying
    @Query(value = """
            INSERT INTO price_history (
                asset_id,
                open_price,
                close_price,
                high_price,
                low_price,
                volume,
                price_timestamp
            )
            VALUES (
                :assetId,
                :open,
                :close,
                :high,
                :low,
                :volume,
                :timestamp
            )
            ON CONFLICT (asset_id, price_timestamp)
            DO UPDATE SET
                open_price = EXCLUDED.open_price,
                close_price = EXCLUDED.close_price,
                high_price = EXCLUDED.high_price,
                low_price = EXCLUDED.low_price,
                volume = EXCLUDED.volume
            """, nativeQuery = true)
    void upsertPrice(
            @Param("assetId") String assetId,
            @Param("open") BigDecimal open,
            @Param("close") BigDecimal close,
            @Param("high") BigDecimal high,
            @Param("low") BigDecimal low,
            @Param("volume") BigDecimal volume,
            @Param("timestamp") Instant timestamp
    );
}
