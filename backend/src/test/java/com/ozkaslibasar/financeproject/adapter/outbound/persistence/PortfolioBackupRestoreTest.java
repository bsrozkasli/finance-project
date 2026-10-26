package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.FinanceProjectApplication;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetMetadataStatus;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.CsvImportBatch;
import com.ozkaslibasar.financeproject.domain.model.CsvImportBatchStatus;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRow;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRowStatus;
import com.ozkaslibasar.financeproject.domain.model.ExposureStatus;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.model.PortfolioState;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioCsvImportService;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import com.ozkaslibasar.financeproject.domain.service.PortfolioStateService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.Container.ExecResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.MountableFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * R-23: a repeatable logical backup/restore exercise. It is EVIDENCE of logical recoverability only: it sets no
 * recovery objective (RPO/RTO), encryption, retention or access-control requirement (OQ-8 stays open).
 *
 * <p>Container A is filled through the application's own beans, dumped with {@code pg_dump -Fc}, restored with
 * {@code pg_restore} into an empty database of a fresh container B, and a second application context (Flyway
 * validation included) is started against B. Timings are printed for information; the only bound is a generous guard.
 * Both contexts run in this JVM.</p>
 *
 * <p>Opt-in (R-30): {@code -Dbackup.restore=true}; it takes about 55 s, so it stays out of the default suite. See
 * {@code docs/spec/current-system/operations.md}.</p>
 */
@Testcontainers(disabledWithoutDocker = true)
@EnabledIfSystemProperty(named = "backup.restore", matches = "true")
class PortfolioBackupRestoreTest {

    private static final String USER = "backup-restore-user";
    private static final String RESTORED_DB = "restored";
    private static final String DUMP_IN_CONTAINER = "/tmp/finance.dump";
    private static final long GUARD_MILLIS = 110_000;
    private static final LocalDate STATE_ONE_AS_OF = LocalDate.of(2026, 10, 20);
    private static final LocalDate STATE_TWO_AS_OF = LocalDate.of(2026, 10, 24);

    private static final String CSV = """
            trade_date,action,symbol,asset_type,quantity,price,currency,fee,fx_rate_to_base,notes
            2026-10-10,BUY,SAP,US_STOCK,3,120.5,USD,0,1,csv buy kept
            2026-10-11,BUY,TSLA,US_STOCK,2,200,USD,0,1,csv buy voided later
            2026-10-12,NOT_AN_ACTION,TSLA,US_STOCK,1,1,USD,0,1,invalid row
            """;

    private static ConfigurableApplicationContext start(PostgreSQLContainer<?> container, String database) {
        String url = jdbcUrl(container, database);
        ConfigurableApplicationContext context = new SpringApplicationBuilder(FinanceProjectApplication.class)
                .profiles("test")
                .run(
                        "--spring.datasource.url=" + url,
                        "--spring.datasource.username=" + container.getUsername(),
                        "--spring.datasource.password=" + container.getPassword(),
                        "--spring.datasource.driver-class-name=org.postgresql.Driver",
                        "--spring.jpa.show-sql=false",
                        "--server.port=0");
        assertThat(context.getEnvironment().getProperty("spring.datasource.url")).isEqualTo(url);
        return context;
    }

    private static String jdbcUrl(PostgreSQLContainer<?> container, String database) {
        return "jdbc:postgresql://" + container.getHost() + ":" + container.getMappedPort(5432) + "/" + database;
    }

    private static PortfolioTransaction manual(Long portfolioId, String symbol, PortfolioTransactionAction action,
                                               String qty, String price, int day) {
        return new PortfolioTransaction(null, portfolioId, USER, symbol, PortfolioAssetType.US_STOCK, action,
                qty == null ? null : new BigDecimal(qty), price == null ? null : new BigDecimal(price), "USD",
                new BigDecimal("0.5"), BigDecimal.ONE, LocalDate.of(2026, 10, day),
                PortfolioTransactionSource.MANUAL, null, null, null);
    }

    private static PriceHistory close(String symbol, String close, LocalDate date) {
        BigDecimal c = new BigDecimal(close);
        return new PriceHistory(symbol, c, c, c, c, BigDecimal.ONE, date.atStartOfDay());
    }

    private static ExecResult exec(PostgreSQLContainer<?> container, String... command) throws Exception {
        ExecResult result = container.execInContainer(command);
        assertThat(result.getExitCode())
                .as("%s%nstdout: %s%nstderr: %s", String.join(" ", command), result.getStdout(), result.getStderr())
                .isZero();
        return result;
    }

    /** Everything the comparison needs, read through the application's own beans and plain SQL. */
    private record Snapshot(
            Map<String, Long> rowCounts,
            Map<String, String> tableDigests,
            long activeEvents,
            long voidedEvents,
            long csvBatches,
            long csvRows,
            List<String> batchStatuses,
            List<String> rowOutcomes,
            List<String> flywayHistory,
            List<String> stateVersions,
            List<PortfolioHolding> holdings) {
    }

    private static Snapshot snapshot(ConfigurableApplicationContext context, Long portfolioId) {
        JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
        Map<String, Long> counts = new LinkedHashMap<>();
        Map<String, String> digests = new LinkedHashMap<>();
        List<String> tables = jdbc.queryForList("SELECT table_name FROM information_schema.tables "
                + "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name", String.class);
        for (String table : tables) {
            counts.put(table, jdbc.queryForObject("SELECT count(*) FROM \"" + table + "\"", Long.class));
            digests.put(table, jdbc.queryForObject("SELECT coalesce(md5(string_agg(t::text, '|' ORDER BY t::text)), '')"
                    + " FROM \"" + table + "\" t", String.class));
        }
        return new Snapshot(
                counts,
                digests,
                jdbc.queryForObject("SELECT count(*) FROM portfolio_transactions WHERE voided_at IS NULL", Long.class),
                jdbc.queryForObject("SELECT count(*) FROM portfolio_transactions WHERE voided_at IS NOT NULL",
                        Long.class),
                jdbc.queryForObject("SELECT count(*) FROM portfolio_csv_imports", Long.class),
                jdbc.queryForObject("SELECT count(*) FROM portfolio_csv_import_rows", Long.class),
                jdbc.queryForList("SELECT id || ':' || status FROM portfolio_csv_imports ORDER BY id", String.class),
                jdbc.queryForList("SELECT batch_id || '/' || row_number || ':' || status || ':' "
                        + "|| coalesce(message, '-') || ':' || coalesce(transaction_id::text, '-') "
                        + "FROM portfolio_csv_import_rows ORDER BY batch_id, row_number", String.class),
                jdbc.queryForList("SELECT installed_rank || ':' || coalesce(version, '-') || ':' || description "
                        + "|| ':' || coalesce(checksum::text, '-') || ':' || success "
                        + "FROM flyway_schema_history ORDER BY installed_rank", String.class),
                jdbc.queryForList("SELECT version FROM portfolio_states WHERE portfolio_id = ? ORDER BY as_of, version",
                        String.class, portfolioId),
                context.getBean(PortfolioLedgerService.class).calculateHoldings(portfolioId, USER));
    }

    private static Path tempDump() throws IOException {
        return Files.createTempFile("finance-backup-restore", ".dump");
    }

    @Test
    void aLogicalBackupRestoredIntoAFreshDatabaseReplaysEveryStoredState() throws Exception {
        Path dump = tempDump();
        try (PostgreSQLContainer<?> a = new PostgreSQLContainer<>("postgres:16-alpine");
             PostgreSQLContainer<?> b = new PostgreSQLContainer<>("postgres:16-alpine")) {
            a.start();
            b.start();

            // ---- Container A: seed through the application's own beans ----
            Long portfolioId;
            Snapshot before;
            String stateOneVersion;
            String stateTwoVersion;
            PortfolioState stateOne;
            PortfolioState stateTwo;
            long seedStart = System.nanoTime();
            try (ConfigurableApplicationContext first = start(a, a.getDatabaseName())) {
                portfolioId = first.getBean(PortfolioPort.class)
                        .save(new Portfolio(null, USER, "Backup restore", "USD", null, false, null, null)).id();
                PortfolioLedgerService ledger = first.getBean(PortfolioLedgerService.class);
                PortfolioStateService states = first.getBean(PortfolioStateService.class);
                AssetRepositoryPort assets = first.getBean(AssetRepositoryPort.class);
                PriceRepositoryPort prices = first.getBean(PriceRepositoryPort.class);

                assets.save(new Asset("AAPL", "Apple", AssetType.STOCK, "NASDAQ", "USD", "fixture", "AAPL",
                        AssetMetadataStatus.VERIFIED));
                assets.save(new Asset("MSFT", "Microsoft", AssetType.STOCK, "NASDAQ", "USD", "fixture", "MSFT",
                        AssetMetadataStatus.VERIFIED));
                // SAP is priced in EUR while the ledger and portfolio are USD: CURRENCY_MISMATCH, so PARTIAL.
                assets.save(new Asset("SAP", "SAP", AssetType.STOCK, "XETRA", "EUR", "fixture", "SAP",
                        AssetMetadataStatus.VERIFIED));
                prices.saveAll(List.of(
                        close("AAPL", "130.50", LocalDate.of(2026, 10, 19)),
                        close("MSFT", "410.25", LocalDate.of(2026, 10, 19)),
                        close("SAP", "150.00", LocalDate.of(2026, 10, 23))));

                ledger.addTransaction(manual(portfolioId, "AAPL", PortfolioTransactionAction.BUY, "10", "100.25", 1));
                ledger.addTransaction(manual(portfolioId, "AAPL", PortfolioTransactionAction.SELL, "4", "130.10", 2));
                PortfolioTransaction msft = ledger.addTransaction(
                        manual(portfolioId, "MSFT", PortfolioTransactionAction.BUY, "5", "400", 3));
                ledger.addTransaction(manual(portfolioId, "AAPL", PortfolioTransactionAction.DIVIDEND, null, "0.82", 5));

                // State one is stored while the MSFT buy is still active, and replayed after that buy is voided.
                PortfolioStateService.CreatedState createdOne = states.create(portfolioId, USER, STATE_ONE_AS_OF);
                stateOne = createdOne.state();
                assertThat(createdOne.created()).isTrue();
                assertThat(stateOne.exposureStatus()).isEqualTo(ExposureStatus.COMPLETE);
                assertThat(stateOne.sourceEventIds()).contains(msft.id());

                ledger.voidTransaction(portfolioId, USER, msft.id(), Instant.parse("2026-10-21T10:00:00Z"), () -> { });

                PortfolioCsvImportService csv = first.getBean(PortfolioCsvImportService.class);
                CsvImportBatch staged = csv.stage(portfolioId, USER, CSV.getBytes(StandardCharsets.UTF_8));
                assertThat(staged.rows()).extracting(CsvImportRow::status).containsExactly(
                        CsvImportRowStatus.VALID, CsvImportRowStatus.VALID, CsvImportRowStatus.INVALID);
                CsvImportBatch accepted = csv.accept(portfolioId, USER, staged.id()).orElseThrow();
                assertThat(accepted.status()).isEqualTo(CsvImportBatchStatus.ACCEPTED);
                assertThat(accepted.rows()).extracting(CsvImportRow::status).containsExactly(
                        CsvImportRowStatus.ACCEPTED, CsvImportRowStatus.ACCEPTED, CsvImportRowStatus.INVALID);
                Long tslaEventId = accepted.rows().get(1).transactionId();
                ledger.voidTransaction(portfolioId, USER, tslaEventId, Instant.parse("2026-10-22T10:00:00Z"), () -> { });

                // Re-staging the same file: both ledger rows (one active, one voided) are DUPLICATE.
                CsvImportBatch again = csv.stage(portfolioId, USER, CSV.getBytes(StandardCharsets.UTF_8));
                assertThat(again.rows()).extracting(CsvImportRow::status).containsExactly(
                        CsvImportRowStatus.DUPLICATE, CsvImportRowStatus.DUPLICATE, CsvImportRowStatus.INVALID);
                csv.accept(portfolioId, USER, again.id());
                // A third batch stays STAGED, so both batch statuses are covered.
                csv.stage(portfolioId, USER, ("trade_date,action,symbol,asset_type,quantity,price,currency,fee,"
                        + "fx_rate_to_base,notes\n2026-10-13,BUY,KO,US_STOCK,1,60,USD,0,1,staged only\n")
                        .getBytes(StandardCharsets.UTF_8));

                PortfolioStateService.CreatedState createdTwo = states.create(portfolioId, USER, STATE_TWO_AS_OF);
                stateTwo = createdTwo.state();
                assertThat(createdTwo.created()).isTrue();
                assertThat(stateTwo.exposureStatus()).isEqualTo(ExposureStatus.PARTIAL);
                assertThat(states.replay(portfolioId, USER, stateOne.version())).isPresent();

                stateOneVersion = stateOne.version();
                stateTwoVersion = stateTwo.version();
                before = snapshot(first, portfolioId);
            }
            long seedMillis = (System.nanoTime() - seedStart) / 1_000_000;
            assertThat(before.voidedEvents()).isEqualTo(2);
            assertThat(before.batchStatuses()).hasSize(3);
            assertThat(before.stateVersions()).containsExactlyInAnyOrder(stateOneVersion, stateTwoVersion);

            // ---- Logical backup of A, restore into an empty database of B ----
            long dumpStart = System.nanoTime();
            exec(a, "pg_dump", "-U", a.getUsername(), "-d", a.getDatabaseName(), "-Fc", "-f", DUMP_IN_CONTAINER);
            a.copyFileFromContainer(DUMP_IN_CONTAINER, dump.toString());
            long dumpMillis = (System.nanoTime() - dumpStart) / 1_000_000;
            assertThat(Files.size(dump)).isPositive();

            long restoreStart = System.nanoTime();
            b.copyFileToContainer(MountableFile.forHostPath(dump), DUMP_IN_CONTAINER);
            exec(b, "createdb", "-U", b.getUsername(), RESTORED_DB);
            exec(b, "pg_restore", "-U", b.getUsername(), "-d", RESTORED_DB, "--no-owner", "--exit-on-error",
                    DUMP_IN_CONTAINER);
            long restoreMillis = (System.nanoTime() - restoreStart) / 1_000_000;

            // ---- Container B: a new context validates Flyway against the restored history, then we verify ----
            long verifyStart = System.nanoTime();
            long startMillis;
            try (ConfigurableApplicationContext second = start(b, RESTORED_DB)) {
                startMillis = (System.nanoTime() - verifyStart) / 1_000_000;
                Snapshot after = snapshot(second, portfolioId);

                assertThat(after.activeEvents()).isEqualTo(before.activeEvents());
                assertThat(after.voidedEvents()).isEqualTo(before.voidedEvents());
                assertThat(after.csvBatches()).isEqualTo(before.csvBatches());
                assertThat(after.csvRows()).isEqualTo(before.csvRows());
                assertThat(after.batchStatuses()).isEqualTo(before.batchStatuses());
                assertThat(after.rowOutcomes()).isEqualTo(before.rowOutcomes());
                assertThat(after.flywayHistory()).isEqualTo(before.flywayHistory());
                assertThat(after.stateVersions()).isEqualTo(before.stateVersions());
                assertThat(after.holdings()).isEqualTo(before.holdings());
                assertThat(after.rowCounts()).isEqualTo(before.rowCounts());
                assertThat(after.tableDigests()).isEqualTo(before.tableDigests());

                PortfolioStateService states = second.getBean(PortfolioStateService.class);
                for (String version : before.stateVersions()) {
                    PortfolioState replayed = states.replay(portfolioId, USER, version).orElseThrow();
                    assertThat(replayed.version()).isEqualTo(version);
                }
                // The state stored before the void still replays after it, from its stored event ids.
                assertThat(states.replay(portfolioId, USER, stateOneVersion).orElseThrow().exposureStatus())
                        .isEqualTo(ExposureStatus.COMPLETE);
                assertThat(states.replay(portfolioId, USER, stateTwoVersion).orElseThrow().exposureStatus())
                        .isEqualTo(ExposureStatus.PARTIAL);

                // Voided events still reserve their locators: the active SAP row and the voided TSLA row stay DUPLICATE.
                PortfolioCsvImportService csv = second.getBean(PortfolioCsvImportService.class);
                CsvImportBatch restaged = csv.stage(portfolioId, USER, CSV.getBytes(StandardCharsets.UTF_8));
                assertThat(restaged.rows()).extracting(CsvImportRow::status).containsExactly(
                        CsvImportRowStatus.DUPLICATE, CsvImportRowStatus.DUPLICATE, CsvImportRowStatus.INVALID);
                List<Long> voidedIds = second.getBean(JdbcTemplate.class).queryForList(
                        "SELECT id FROM portfolio_transactions WHERE voided_at IS NOT NULL ORDER BY id", Long.class);
                assertThat(voidedIds).hasSize(2);

                // Sequences were restored too: a new ledger event gets an id above every restored id.
                Long maxRestoredId = second.getBean(JdbcTemplate.class)
                        .queryForObject("SELECT max(id) FROM portfolio_transactions", Long.class);
                PortfolioTransaction inserted = second.getBean(PortfolioLedgerService.class).addTransaction(
                        manual(portfolioId, "AAPL", PortfolioTransactionAction.BUY, "1", "131", 6));
                assertThat(inserted.id()).isGreaterThan(maxRestoredId);
            }
            long verifyMillis = (System.nanoTime() - verifyStart) / 1_000_000;

            List<String> lines = new ArrayList<>();
            lines.add("BACKUP-RESTORE TIMINGS (information only, ms): seed=" + seedMillis + " dump+copy-out="
                    + dumpMillis + " copy-in+restore=" + restoreMillis + " context-start-on-restored=" + startMillis
                    + " verify-total=" + verifyMillis + " dumpBytes=" + Files.size(dump));
            lines.forEach(System.out::println);
            assertThat(dumpMillis + restoreMillis + verifyMillis).isLessThan(GUARD_MILLIS);
        } finally {
            Files.deleteIfExists(dump);
        }
    }
}
