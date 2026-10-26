package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import com.ozkaslibasar.financeproject.domain.model.CsvImportBatch;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRowStatus;

import java.time.Instant;
import java.util.List;

/** Response of the CSV import routes (decision D-4). Absent values are JSON {@code null}. */
public record PortfolioImportResponse(
        Long batchId,
        Long portfolioId,
        String status,
        String fileSha256,
        Instant createdAt,
        Instant acceptedAt,
        Counts counts,
        List<Row> rows
) {
    public record Counts(long valid, long invalid, long duplicate, long accepted, long rejected) {
    }

    public record Row(int rowNumber, String status, String message, String originLocator, Long transactionId) {
    }

    public static PortfolioImportResponse from(CsvImportBatch batch) {
        Counts counts = new Counts(
                batch.count(CsvImportRowStatus.VALID),
                batch.count(CsvImportRowStatus.INVALID),
                batch.count(CsvImportRowStatus.DUPLICATE),
                batch.count(CsvImportRowStatus.ACCEPTED),
                batch.count(CsvImportRowStatus.REJECTED));
        List<Row> rows = batch.rows().stream()
                .map(row -> new Row(row.rowNumber(), row.status().name(), row.message(), row.originLocator(),
                        row.transactionId()))
                .toList();
        return new PortfolioImportResponse(batch.id(), batch.portfolioId(), batch.status().name(),
                batch.fileSha256(), batch.createdAt(), batch.acceptedAt(), counts, rows);
    }
}
