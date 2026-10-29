package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.CsvImportBatchEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.CsvImportRowEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.CsvImportBatchJpaRepository;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.CsvImportRowJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.CsvImportBatch;
import com.ozkaslibasar.financeproject.domain.model.CsvImportBatchStatus;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRow;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRowStatus;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioCsvImportPort;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Staging persistence; each outcome write is its own short transaction (see {@code PortfolioCsvImportService}). */
@Component
@RequiredArgsConstructor
public class PortfolioCsvImportRepositoryAdapter implements PortfolioCsvImportPort {

    private final CsvImportBatchJpaRepository batches;
    private final CsvImportRowJpaRepository rows;

    @Override
    @Transactional
    public CsvImportBatch saveStaged(CsvImportBatch batch) {
        CsvImportBatchEntity entity = new CsvImportBatchEntity();
        entity.setPortfolioId(batch.portfolioId());
        entity.setUserId(batch.userId());
        entity.setFileSha256(batch.fileSha256());
        entity.setStatus(batch.status());
        entity.setCreatedAt(batch.createdAt());
        entity.setAcceptedAt(batch.acceptedAt());
        CsvImportBatchEntity saved = batches.save(entity);
        List<CsvImportRowEntity> savedRows = rows.saveAll(
                batch.rows().stream().map(row -> toEntity(saved.getId(), row)).toList());
        return toDomain(saved, savedRows);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CsvImportBatch> findByIdAndPortfolioIdAndUserId(Long batchId, Long portfolioId, String userId) {
        return batches.findByIdAndPortfolioIdAndUserId(batchId, portfolioId, userId)
                .map(entity -> toDomain(entity, rows.findByBatchIdOrderByRowNumberAsc(entity.getId())));
    }

    /** Not @Transactional itself: the repository update is its own transaction, so a claim conflict rolls back cleanly. */
    @Override
    public boolean recordRowResult(Long rowId, CsvImportRowStatus status, String message, Long transactionId) {
        try {
            return rows.recordResult(rowId, status, message, transactionId, CsvImportRowStatus.VALID) > 0;
        } catch (DataIntegrityViolationException e) {
            // The event is already recorded by another row (unique transaction_id).
            return false;
        }
    }

    @Override
    @Transactional
    public boolean markAccepted(Long batchId, Instant acceptedAt) {
        return batches.markAccepted(batchId, acceptedAt, CsvImportBatchStatus.ACCEPTED, CsvImportBatchStatus.STAGED) > 0;
    }

    private static CsvImportRowEntity toEntity(Long batchId, CsvImportRow row) {
        CsvImportRowEntity e = new CsvImportRowEntity();
        e.setBatchId(batchId);
        e.setRowNumber(row.rowNumber());
        e.setRawLine(row.rawLine());
        e.setOriginLocator(row.originLocator());
        e.setStatus(row.status());
        e.setMessage(row.message());
        e.setTransactionId(row.transactionId());
        PortfolioTransaction tx = row.transaction();
        if (tx != null) {
            e.setTradeDate(tx.tradeDate());
            e.setAction(tx.action());
            e.setSymbol(tx.symbol());
            e.setAssetType(tx.assetType());
            e.setQuantity(tx.quantity());
            e.setPrice(tx.price());
            e.setCurrency(tx.currency());
            e.setFee(tx.fee());
            e.setFxRateToBase(tx.fxRateToBase());
            e.setNotes(tx.notes());
        }
        return e;
    }

    private static CsvImportBatch toDomain(CsvImportBatchEntity batch, List<CsvImportRowEntity> rowEntities) {
        List<CsvImportRow> domainRows = rowEntities.stream().map(row -> toDomain(batch, row)).toList();
        return new CsvImportBatch(batch.getId(), batch.getPortfolioId(), batch.getUserId(), batch.getFileSha256(),
                batch.getStatus(), batch.getCreatedAt(), batch.getAcceptedAt(), domainRows);
    }

    private static CsvImportRow toDomain(CsvImportBatchEntity batch, CsvImportRowEntity e) {
        PortfolioTransaction tx = e.getTradeDate() == null ? null : new PortfolioTransaction(null,
                batch.getPortfolioId(), batch.getUserId(), e.getSymbol(), e.getAssetType(), e.getAction(),
                e.getQuantity(), e.getPrice(), e.getCurrency(), e.getFee(), e.getFxRateToBase(), e.getTradeDate(),
                PortfolioTransactionSource.CSV, e.getNotes(), null, null, e.getOriginLocator(), null);
        return new CsvImportRow(e.getId(), e.getRowNumber(), e.getRawLine(), e.getOriginLocator(), e.getStatus(),
                e.getMessage(), tx, e.getTransactionId());
    }
}
