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

    private static final String ALREADY_IN_LEDGER = "Already in the ledger (active or voided)";

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
            acceptRow(found.get(), row);
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
                inLedger ? ALREADY_IN_LEDGER : null, parsed.transaction(), null);
    }

    /**
     * The locator embeds portfolio and user (R-10), so an active event with it is this portfolio's. If no other row
     * has recorded that event yet (an earlier accept of this batch crashed between insert and recording, or a
     * concurrent accept of this batch inserted it), this row claims it as ACCEPTED; the unique
     * {@code transaction_id} on rows makes the claim exclusive, so a second batch with the same rows gets DUPLICATE.
     */
    private void acceptRow(CsvImportBatch batch, CsvImportRow row) {
        PortfolioTransaction candidate = row.transaction();
        try {
            if (transactionPort.existsBySourceAndOriginLocator(candidate.source(), candidate.originLocator())) {
                settleExistingLocator(batch, row, candidate);
                return;
            }
            PortfolioTransaction saved = ledger.addTransaction(candidate);
            settle(batch, row, CsvImportRowStatus.ACCEPTED, null, saved.id());
        } catch (DuplicateOriginLocatorException e) {
            settleExistingLocator(batch, row, candidate);
        } catch (IllegalArgumentException e) {
            settle(batch, row, CsvImportRowStatus.REJECTED, e.getMessage(), null);
        }
    }

    /** The locator is known to exist (committed): look up its active event; none left means only a voided one. */
    private void settleExistingLocator(CsvImportBatch batch, CsvImportRow row, PortfolioTransaction candidate) {
        Optional<PortfolioTransaction> active = transactionPort.findActiveBySourceAndOriginLocator(
                candidate.source(), candidate.originLocator());
        if (active.isPresent()) {
            settleExisting(batch, row, active.get());
        } else {
            settle(batch, row, CsvImportRowStatus.DUPLICATE, ALREADY_IN_LEDGER, null);
        }
    }

    private void settleExisting(CsvImportBatch batch, CsvImportRow row, PortfolioTransaction event) {
        boolean ours = batch.portfolioId().equals(event.portfolioId()) && batch.userId().equals(event.userId());
        if (ours) {
            settle(batch, row, CsvImportRowStatus.ACCEPTED, null, event.id());
        } else {
            settle(batch, row, CsvImportRowStatus.DUPLICATE, ALREADY_IN_LEDGER, null);
        }
    }

    /**
     * Records the outcome. When it was not applied (the row is no longer VALID, or its event is already recorded by
     * another row) the row is re-read instead of assumed: if it is still VALID the event belongs to another row, so
     * it is DUPLICATE; otherwise another accept already settled it and that outcome stands.
     */
    private void settle(CsvImportBatch batch, CsvImportRow row, CsvImportRowStatus status, String message,
                        Long transactionId) {
        if (importPort.recordRowResult(row.id(), status, message, transactionId)) {
            return;
        }
        boolean stillValid = find(batch.portfolioId(), batch.userId(), batch.id())
                .flatMap(current -> current.rows().stream().filter(r -> r.id().equals(row.id())).findFirst())
                .map(current -> current.status() == CsvImportRowStatus.VALID)
                .orElse(false);
        if (stillValid) {
            importPort.recordRowResult(row.id(), CsvImportRowStatus.DUPLICATE, ALREADY_IN_LEDGER, null);
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
