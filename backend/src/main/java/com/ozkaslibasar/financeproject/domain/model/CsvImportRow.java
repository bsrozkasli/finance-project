package com.ozkaslibasar.financeproject.domain.model;

/**
 * One staged CSV data row. {@code transaction} holds the parsed ledger event (id null, source CSV) and is null for
 * an INVALID row; {@code transactionId} is set only once the row was inserted into the ledger.
 */
public record CsvImportRow(
        Long id,
        int rowNumber,
        String rawLine,
        String originLocator,
        CsvImportRowStatus status,
        String message,
        PortfolioTransaction transaction,
        Long transactionId
) {
    public CsvImportRow withResult(CsvImportRowStatus newStatus, String newMessage, Long newTransactionId) {
        return new CsvImportRow(id, rowNumber, rawLine, originLocator, newStatus, newMessage, transaction,
                newTransactionId);
    }
}
