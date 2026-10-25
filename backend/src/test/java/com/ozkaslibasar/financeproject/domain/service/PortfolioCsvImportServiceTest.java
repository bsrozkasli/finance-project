package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.CsvImportBatch;
import com.ozkaslibasar.financeproject.domain.model.CsvImportBatchStatus;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRow;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRowStatus;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioCsvImportPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** EPIC-002 Task 4 / D-4: staging classification and acceptance through the ledger, with in-memory ports. */
class PortfolioCsvImportServiceTest {

    private static final Long PORTFOLIO = 7L;
    private static final String USER = "default";
    private static final String HEADER =
            "trade_date,action,symbol,asset_type,quantity,price,currency,fee,fx_rate_to_base,notes\n";
    private static final String BUY = "2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,\n";
    private static final String SELL_5 = "2026-10-02,SELL,AAPL,US_STOCK,5,110,USD,0,1,\n";
    private static final Instant NOW = Instant.parse("2026-10-25T12:00:00Z");

    private InMemoryTransactions transactions;
    private InMemoryImports imports;
    private PortfolioCsvImportService service;

    @BeforeEach
    void setUp() {
        transactions = new InMemoryTransactions();
        imports = new InMemoryImports();
        service = new PortfolioCsvImportService(imports, transactions, new PortfolioLedgerService(transactions),
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private CsvImportBatch stage(String body) {
        return service.stage(PORTFOLIO, USER, (HEADER + body).getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void stagesValidAndInvalidRowsAndNothingEntersTheLedger() {
        CsvImportBatch batch = stage(BUY + "bad-date,BUY,AAPL,US_STOCK,1,1,USD,0,1,\n");

        assertThat(batch.id()).isNotNull();
        assertThat(batch.status()).isEqualTo(CsvImportBatchStatus.STAGED);
        assertThat(batch.createdAt()).isEqualTo(NOW);
        assertThat(batch.acceptedAt()).isNull();
        assertThat(batch.fileSha256()).matches("[0-9a-f]{64}");
        assertThat(batch.rows()).extracting(CsvImportRow::status)
                .containsExactly(CsvImportRowStatus.VALID, CsvImportRowStatus.INVALID);
        assertThat(batch.rows().get(0).originLocator()).startsWith("csv:");
        assertThat(batch.rows().get(1).originLocator()).isNull();
        assertThat(batch.rows().get(1).message()).isNotBlank();
        assertThat(transactions.saved).isEmpty();
    }

    @Test
    void sameBytesGiveSameFileHash() {
        assertThat(stage(BUY).fileSha256()).isEqualTo(stage(BUY).fileSha256());
        assertThat(stage(BUY).fileSha256()).isNotEqualTo(stage(SELL_5).fileSha256());
    }

    @Test
    void rejectsWholeFileBeforeStagingAnything() {
        assertThatThrownBy(() -> service.stage(PORTFOLIO, USER, "a,b\n1,2\n".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(imports.batches).isEmpty();
    }

    @Test
    void marksRowDuplicateWhenLocatorAlreadyInLedgerEvenIfVoided() {
        service.accept(PORTFOLIO, USER, stage(BUY).id());
        PortfolioTransaction event = transactions.saved.get(0);
        transactions.voidEvent(event);

        CsvImportBatch again = stage(BUY);

        assertThat(again.rows()).extracting(CsvImportRow::status).containsExactly(CsvImportRowStatus.DUPLICATE);
        assertThat(again.rows().get(0).originLocator()).isEqualTo(event.originLocator());
    }

    @Test
    void reorderedReimportOfAcceptedRowsIsAllDuplicate() {
        service.accept(PORTFOLIO, USER, stage(BUY + BUY + SELL_5).id());
        assertThat(transactions.saved).hasSize(3);

        CsvImportBatch reordered = stage(SELL_5 + BUY + BUY);

        assertThat(reordered.rows()).extracting(CsvImportRow::status)
                .containsOnly(CsvImportRowStatus.DUPLICATE).hasSize(3);
    }

    @Test
    void acceptInsertsValidRowsInTradeDateThenRowOrderEvenWhenFileIsOutOfOrder() {
        // The sell is listed first but dated later; it is only valid because the buy is inserted before it.
        CsvImportBatch staged = stage(SELL_5 + BUY);

        CsvImportBatch accepted = service.accept(PORTFOLIO, USER, staged.id()).orElseThrow();

        assertThat(accepted.status()).isEqualTo(CsvImportBatchStatus.ACCEPTED);
        assertThat(accepted.acceptedAt()).isEqualTo(NOW);
        assertThat(transactions.saved).extracting(PortfolioTransaction::action)
                .extracting(Enum::name).containsExactly("BUY", "SELL");
        assertThat(accepted.rows()).extracting(CsvImportRow::status)
                .containsExactly(CsvImportRowStatus.ACCEPTED, CsvImportRowStatus.ACCEPTED);
        assertThat(accepted.rows()).allSatisfy(row -> assertThat(row.transactionId()).isNotNull());
        assertThat(transactions.saved).allSatisfy(tx -> {
            assertThat(tx.source()).isEqualTo(PortfolioTransactionSource.CSV);
            assertThat(tx.originLocator()).startsWith("csv:");
        });
    }

    @Test
    void sameDateRowsKeepFileRowOrder() {
        String buy = "2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,\n";
        String sell = "2026-10-01,SELL,AAPL,US_STOCK,10,110,USD,0,1,\n";

        CsvImportBatch accepted = service.accept(PORTFOLIO, USER, stage(buy + sell).id()).orElseThrow();

        assertThat(accepted.rows()).extracting(CsvImportRow::status)
                .containsExactly(CsvImportRowStatus.ACCEPTED, CsvImportRowStatus.ACCEPTED);
    }

    @Test
    void ledgerRejectionMarksRowRejectedWithMessageAndKeepsOtherRows() {
        String oversell = "2026-10-03,SELL,AAPL,US_STOCK,99,110,USD,0,1,\n";

        CsvImportBatch accepted = service.accept(PORTFOLIO, USER, stage(BUY + oversell).id()).orElseThrow();

        assertThat(accepted.status()).isEqualTo(CsvImportBatchStatus.ACCEPTED);
        assertThat(accepted.rows().get(0).status()).isEqualTo(CsvImportRowStatus.ACCEPTED);
        assertThat(accepted.rows().get(1).status()).isEqualTo(CsvImportRowStatus.REJECTED);
        assertThat(accepted.rows().get(1).message()).contains("sell quantity exceeds");
        assertThat(accepted.rows().get(1).transactionId()).isNull();
        assertThat(transactions.saved).hasSize(1);
    }

    @Test
    void invalidRowsNeverEnterTheLedgerAndStayInvalid() {
        CsvImportBatch accepted = service.accept(PORTFOLIO, USER,
                stage(BUY + "bad,BUY,AAPL,US_STOCK,1,1,USD,0,1,\n").id()).orElseThrow();

        assertThat(accepted.rows().get(1).status()).isEqualTo(CsvImportRowStatus.INVALID);
        assertThat(transactions.saved).hasSize(1);
    }

    @Test
    void acceptingTwiceReturnsTheBatchUnchangedWithoutNewEvents() {
        CsvImportBatch staged = stage(BUY);
        CsvImportBatch first = service.accept(PORTFOLIO, USER, staged.id()).orElseThrow();
        CsvImportBatch second = service.accept(PORTFOLIO, USER, staged.id()).orElseThrow();

        assertThat(second).isEqualTo(first);
        assertThat(transactions.saved).hasSize(1);
    }

    @Test
    void anotherBatchWithSameRowsStagedBeforeAcceptanceBecomesDuplicateOnAccept() {
        CsvImportBatch one = stage(BUY);
        CsvImportBatch two = stage(BUY);

        service.accept(PORTFOLIO, USER, one.id());
        CsvImportBatch acceptedTwo = service.accept(PORTFOLIO, USER, two.id()).orElseThrow();

        assertThat(acceptedTwo.rows()).extracting(CsvImportRow::status).containsExactly(CsvImportRowStatus.DUPLICATE);
        assertThat(transactions.saved).hasSize(1);
    }

    @Test
    void uniqueConstraintConflictAtInsertMarksRowDuplicate() {
        CsvImportBatch staged = stage(BUY);
        transactions.failNextCsvSaveWithConflict = true;

        CsvImportBatch accepted = service.accept(PORTFOLIO, USER, staged.id()).orElseThrow();

        assertThat(accepted.rows()).extracting(CsvImportRow::status).containsExactly(CsvImportRowStatus.DUPLICATE);
        assertThat(accepted.status()).isEqualTo(CsvImportBatchStatus.ACCEPTED);
    }

    @Test
    void unknownOrForeignBatchIsEmpty() {
        CsvImportBatch staged = stage(BUY);

        assertThat(service.find(PORTFOLIO, USER, 999L)).isEmpty();
        assertThat(service.find(PORTFOLIO + 1, USER, staged.id())).isEmpty();
        assertThat(service.find(PORTFOLIO, "someone-else", staged.id())).isEmpty();
        assertThat(service.accept(PORTFOLIO, USER, 999L)).isEmpty();
        assertThat(service.find(PORTFOLIO, USER, staged.id())).contains(staged);
    }

    // ---- fakes -----------------------------------------------------------------------------------------------

    private static final class InMemoryTransactions implements PortfolioTransactionPort {
        final List<PortfolioTransaction> saved = new ArrayList<>();
        final List<PortfolioTransaction> voided = new ArrayList<>();
        private final AtomicLong ids = new AtomicLong(100);
        boolean failNextCsvSaveWithConflict;

        @Override
        public List<PortfolioTransaction> findByPortfolioIdAndUserId(Long portfolioId, String userId) {
            return saved.stream().filter(t -> t.portfolioId().equals(portfolioId) && t.userId().equals(userId)).toList();
        }

        @Override
        public Optional<PortfolioTransaction> findByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId) {
            return findByPortfolioIdAndUserId(portfolioId, userId).stream().filter(t -> t.id().equals(id)).findFirst();
        }

        @Override
        public PortfolioTransaction save(PortfolioTransaction t) {
            if (t.source() == PortfolioTransactionSource.CSV
                    && (failNextCsvSaveWithConflict || existsBySourceAndOriginLocator(t.source(), t.originLocator()))) {
                failNextCsvSaveWithConflict = false;
                throw new DuplicateOriginLocatorException(t.originLocator());
            }
            PortfolioTransaction stored = new PortfolioTransaction(ids.incrementAndGet(), t.portfolioId(), t.userId(),
                    t.symbol(), t.assetType(), t.action(), t.quantity(), t.price(), t.currency(), t.fee(),
                    t.fxRateToBase(), t.tradeDate(), t.source(), t.notes(), null, null, t.originLocator(), null);
            saved.add(stored);
            return stored;
        }

        @Override
        public void voidByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId, Instant voidedAt) {
            saved.stream().filter(t -> t.id().equals(id)).findFirst().ifPresent(this::voidEvent);
        }

        void voidEvent(PortfolioTransaction t) {
            saved.remove(t);
            voided.add(t);
        }

        @Override
        public List<PortfolioTransaction> findByIdsIncludingVoided(Long portfolioId, String userId, Collection<Long> ids) {
            return List.of();
        }

        @Override
        public boolean existsBySourceAndOriginLocator(PortfolioTransactionSource source, String originLocator) {
            return java.util.stream.Stream.concat(saved.stream(), voided.stream())
                    .anyMatch(t -> t.source() == source && originLocator.equals(t.originLocator()));
        }
    }

    private static final class InMemoryImports implements PortfolioCsvImportPort {
        final List<CsvImportBatch> batches = new ArrayList<>();
        private final AtomicLong batchIds = new AtomicLong();
        private final AtomicLong rowIds = new AtomicLong();

        @Override
        public CsvImportBatch saveStaged(CsvImportBatch batch) {
            List<CsvImportRow> rows = batch.rows().stream()
                    .map(r -> new CsvImportRow(rowIds.incrementAndGet(), r.rowNumber(), r.rawLine(), r.originLocator(),
                            r.status(), r.message(), r.transaction(), r.transactionId()))
                    .toList();
            CsvImportBatch stored = new CsvImportBatch(batchIds.incrementAndGet(), batch.portfolioId(), batch.userId(),
                    batch.fileSha256(), batch.status(), batch.createdAt(), batch.acceptedAt(), rows);
            batches.add(stored);
            return stored;
        }

        @Override
        public Optional<CsvImportBatch> findByIdAndPortfolioIdAndUserId(Long batchId, Long portfolioId, String userId) {
            return batches.stream().filter(b -> b.id().equals(batchId) && b.portfolioId().equals(portfolioId)
                    && b.userId().equals(userId)).findFirst();
        }

        @Override
        public boolean recordRowResult(Long rowId, CsvImportRowStatus status, String message, Long transactionId) {
            for (int i = 0; i < batches.size(); i++) {
                CsvImportBatch b = batches.get(i);
                List<CsvImportRow> rows = new ArrayList<>(b.rows());
                for (int j = 0; j < rows.size(); j++) {
                    CsvImportRow r = rows.get(j);
                    if (r.id().equals(rowId) && r.status() == CsvImportRowStatus.VALID) {
                        rows.set(j, r.withResult(status, message, transactionId));
                        batches.set(i, new CsvImportBatch(b.id(), b.portfolioId(), b.userId(), b.fileSha256(),
                                b.status(), b.createdAt(), b.acceptedAt(), rows));
                        return true;
                    }
                }
            }
            return false;
        }

        @Override
        public boolean markAccepted(Long batchId, Instant acceptedAt) {
            for (int i = 0; i < batches.size(); i++) {
                CsvImportBatch b = batches.get(i);
                if (b.id().equals(batchId) && b.status() == CsvImportBatchStatus.STAGED) {
                    batches.set(i, new CsvImportBatch(b.id(), b.portfolioId(), b.userId(), b.fileSha256(),
                            CsvImportBatchStatus.ACCEPTED, b.createdAt(), acceptedAt, b.rows()));
                    return true;
                }
            }
            return false;
        }
    }
}
