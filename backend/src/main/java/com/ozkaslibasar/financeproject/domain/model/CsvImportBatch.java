package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.List;

public record CsvImportBatch(
        Long id,
        Long portfolioId,
        String userId,
        String fileSha256,
        CsvImportBatchStatus status,
        Instant createdAt,
        Instant acceptedAt,
        List<CsvImportRow> rows
) {
    public CsvImportBatch {
        rows = rows == null ? List.of() : List.copyOf(rows);
    }

    public long count(CsvImportRowStatus rowStatus) {
        return rows.stream().filter(row -> row.status() == rowStatus).count();
    }
}
