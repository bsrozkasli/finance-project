package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.CsvImportBatch;
import com.ozkaslibasar.financeproject.domain.model.CsvImportBatchStatus;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRow;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRowStatus;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioCsvImportPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * CSV import (decision D-4): a file is staged row by row, then accepted into the ledger.
 *
 * <p>This service is deliberately not transactional. Each ledger insert and each row outcome is its own short
 * transaction in the adapters, so a unique-constraint conflict on one row rolls back only that insert and cannot
 * poison the rest of the batch. An interrupted acceptance leaves the batch STAGED with its remaining rows VALID,
 * and accepting again resumes. The {@code (source, origin_locator)} unique index is what makes concurrent or
 * repeated acceptance create one event per identity.</p>
 */
public class PortfolioCsvImportService {

    private final PortfolioCsvImportPort importPort;
    private final PortfolioTransactionPort transactionPort;
    private final PortfolioLedgerService ledger;
    private final Clock clock;
    private final PortfolioCsvParser parser = new PortfolioCsvParser();

    public PortfolioCsvImportService(PortfolioCsvImportPort importPort, PortfolioTransactionPort transactionPort,
                                     PortfolioLedgerService ledger, Clock clock) {
        this.importPort = Objects.requireNonNull(importPort, "importPort must not be null");
        this.transactionPort = Objects.requireNonNull(transactionPort, "transactionPort must not be null");
        this.ledger = Objects.requireNonNull(ledger, "ledger must not be null");
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
    }

    /** Parses and stages a file. A file-level problem throws {@link IllegalArgumentException} and stages nothing. */
    public CsvImportBatch stage(Long portfolioId, String userId, byte[] content) {
        List<PortfolioCsvParser.ParsedRow> parsed = parser.parse(portfolioId, userId, content);
        List<CsvImportRow> rows = parsed.stream().map(this::toStagedRow).toList();
        return importPort.saveStaged(new CsvImportBatch(null, portfolioId, userId, sha256Hex(content),
                CsvImportBatchStatus.STAGED, clock.instant(), null, rows));
    }

    public Optional<CsvImportBatch> find(Long portfolioId, String userId, Long batchId) {
        return importPort.findByIdAndPortfolioIdAndUserId(batchId, portfolioId, userId);
    }

    /** Accepts the VALID rows in trade-date then row-number order; an already accepted batch is returned as is. */
    public Optional<CsvImportBatch> accept(Long portfolioId, String userId, Long batchId) {
        Optional<CsvImportBatch> found = find(portfolioId, userId, batchId);
        if (found.isEmpty() || found.get().status() == CsvImportBatchStatus.ACCEPTED) {
            return found;
        }
        List<CsvImportRow> pending = found.get().rows().stream()
                .filter(row -> row.status() == CsvImportRowStatus.VALID)
                .sorted(Comparator.comparing((CsvImportRow row) -> row.transaction().tradeDate())
                        .thenComparingInt(CsvImportRow::rowNumber))
                .toList();
        for (CsvImportRow row : pending) {
            acceptRow(row);
        }
        importPort.markAccepted(batchId, clock.instant());
        return find(portfolioId, userId, batchId);
    }

    private CsvImportRow toStagedRow(PortfolioCsvParser.ParsedRow parsed) {
        if (parsed.error() != null) {
            return new CsvImportRow(null, parsed.rowNumber(), parsed.rawLine(), null, CsvImportRowStatus.INVALID,
                    parsed.error(), null, null);
        }
        boolean inLedger = transactionPort.existsBySourceAndOriginLocator(PortfolioTransactionSource.CSV,
                parsed.locator());
        return new CsvImportRow(null, parsed.rowNumber(), parsed.rawLine(), parsed.locator(),
                inLedger ? CsvImportRowStatus.DUPLICATE : CsvImportRowStatus.VALID,
                inLedger ? "Already in the ledger (active or voided)" : null, parsed.transaction(), null);
    }

    private void acceptRow(CsvImportRow row) {
        PortfolioTransaction candidate = row.transaction();
        if (transactionPort.existsBySourceAndOriginLocator(candidate.source(), candidate.originLocator())) {
            importPort.recordRowResult(row.id(), CsvImportRowStatus.DUPLICATE,
                    "Already in the ledger (active or voided)", null);
            return;
        }
        try {
            PortfolioTransaction saved = ledger.addTransaction(candidate);
            importPort.recordRowResult(row.id(), CsvImportRowStatus.ACCEPTED, null, saved.id());
        } catch (DuplicateOriginLocatorException e) {
            importPort.recordRowResult(row.id(), CsvImportRowStatus.DUPLICATE,
                    "Already in the ledger (active or voided)", null);
        } catch (IllegalArgumentException e) {
            importPort.recordRowResult(row.id(), CsvImportRowStatus.REJECTED, e.getMessage(), null);
        }
    }

    private static String sha256Hex(byte[] content) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(content);
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
