package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.CsvImportBatchEntity;
import com.ozkaslibasar.financeproject.domain.model.CsvImportBatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface CsvImportBatchJpaRepository extends JpaRepository<CsvImportBatchEntity, Long> {

    Optional<CsvImportBatchEntity> findByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE CsvImportBatchEntity b SET b.status = :accepted, b.acceptedAt = :acceptedAt
            WHERE b.id = :id AND b.status = :staged
            """)
    int markAccepted(@Param("id") Long id, @Param("acceptedAt") Instant acceptedAt,
                     @Param("accepted") CsvImportBatchStatus accepted, @Param("staged") CsvImportBatchStatus staged);
}
