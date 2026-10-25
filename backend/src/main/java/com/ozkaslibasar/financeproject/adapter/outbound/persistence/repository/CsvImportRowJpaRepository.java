package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.CsvImportRowEntity;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRowStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CsvImportRowJpaRepository extends JpaRepository<CsvImportRowEntity, Long> {

    List<CsvImportRowEntity> findByBatchIdOrderByRowNumberAsc(Long batchId);

    /** Only a still-VALID row changes, so concurrent acceptances cannot overwrite each other's outcome. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE CsvImportRowEntity r SET r.status = :status, r.message = :message, r.transactionId = :transactionId
            WHERE r.id = :id AND r.status = :valid
            """)
    int recordResult(@Param("id") Long id, @Param("status") CsvImportRowStatus status,
                     @Param("message") String message, @Param("transactionId") Long transactionId,
                     @Param("valid") CsvImportRowStatus valid);
}
