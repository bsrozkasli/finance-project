package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.CsvImportBatch;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRowStatus;

import java.time.Instant;
import java.util.Optional;

public interface PortfolioCsvImportPort {

    /** Inserts the batch and its rows in one transaction and returns them with their generated ids. */
    CsvImportBatch saveStaged(CsvImportBatch batch);

    Optional<CsvImportBatch> findByIdAndPortfolioIdAndUserId(Long batchId, Long portfolioId, String userId);

    /**
     * Records the outcome of a still-VALID row. Returns false (and changes nothing) when the row is no longer
     * VALID, so a concurrent acceptance of the same batch cannot overwrite an outcome.
     */
    boolean recordRowResult(Long rowId, CsvImportRowStatus status, String message, Long transactionId);

    /** Marks a STAGED batch ACCEPTED once; returns false when it was not STAGED. */
    boolean markAccepted(Long batchId, Instant acceptedAt);
}
