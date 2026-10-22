package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioTransactionEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.PortfolioTransactionJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import org.flywaydb.core.Flyway;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Real PostgreSQL upgrade and persistence boundary for FR-011. No provider calls or mocks.
 * Expected legacy locators come from SPEC's known persisted-row identity contract.
 */
@Testcontainers(disabledWithoutDocker = true)
class PortfolioTransactionLineagePersistenceTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    private static SessionFactory sessions;
    private static Map<Long, Map<String, Object>> legacyRows;

    @BeforeAll
    static void upgradeLegacyDatabase() throws SQLException {
        migrateTo("7");
        assertThat(currentMigration()).isEqualTo("7");
        try (Connection connection = connection(); var statement = connection.createStatement()) {
            statement.execute("INSERT INTO portfolios (id, name) VALUES (1, 'Lineage acceptance')");
            statement.execute("""
                    INSERT INTO portfolio_transactions
                        (id, portfolio_id, symbol, asset_type, action, quantity, price, trade_date, source, notes)
                    VALUES
                        (101, 1, 'AAPL', 'US_STOCK', 'BUY', 2, 100, DATE '2026-06-01', 'MANUAL', 'legacy manual one'),
                        (102, 1, 'MSFT', 'US_STOCK', 'BUY', 3, 200, DATE '2026-06-02', 'MANUAL', 'legacy manual two'),
                        (201, 1, 'AAPL', 'US_STOCK', 'BUY', 4, 100, DATE '2026-06-03', 'CSV', 'legacy csv one'),
                        (202, 1, 'MSFT', 'US_STOCK', 'BUY', 5, 200, DATE '2026-06-04', 'CSV', 'legacy csv two')
                    """);
        }
        legacyRows = legacyBusinessRows();
        migrateTo("8");
        // Validate only the exercised entities; Hibernate must not create/repair the V8 schema.
        var registry = new StandardServiceRegistryBuilder()
                .applySetting("jakarta.persistence.jdbc.url", postgres.getJdbcUrl())
                .applySetting("jakarta.persistence.jdbc.user", postgres.getUsername())
                .applySetting("jakarta.persistence.jdbc.password", postgres.getPassword())
                .applySetting("hibernate.hbm2ddl.auto", "validate")
                .build();
        sessions = new MetadataSources(registry)
                .addAnnotatedClass(PortfolioEntity.class)
                .addAnnotatedClass(PortfolioTransactionEntity.class)
                .buildMetadata().buildSessionFactory();
    }

    @AfterAll
    static void closePersistence() {
        if (sessions != null) {
            sessions.close();
        }
    }

    @Test
    void v8BackfillsOnlyKnownManualOriginsWithoutChangingLegacyTransactions() throws SQLException {
        assertThat(currentMigration()).isEqualTo("8");
        assertThat(legacyBusinessRows()).isEqualTo(legacyRows);
        try (Connection connection = connection(); var statement = connection.createStatement();
             var rows = statement.executeQuery("""
                     SELECT id, source, origin_locator FROM portfolio_transactions
                     WHERE id IN (101, 102, 201, 202) ORDER BY id
                     """)) {
            Map<Long, String> origins = new LinkedHashMap<>();
            Map<Long, String> sources = new LinkedHashMap<>();
            while (rows.next()) {
                origins.put(rows.getLong("id"), rows.getString("origin_locator"));
                sources.put(rows.getLong("id"), rows.getString("source"));
            }
            assertThat(origins).hasSize(4)
                    .containsEntry(101L, "manual:legacy:101")
                    .containsEntry(102L, "manual:legacy:102")
                    .containsEntry(201L, null).containsEntry(202L, null);
            assertThat(sources).containsEntry(101L, "MANUAL").containsEntry(102L, "MANUAL")
                    .containsEntry(201L, "CSV").containsEntry(202L, "CSV");
        }
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"manual:", "csv:row:1", "not-a-manual-origin"})
    void rejectsMissingOrInvalidManualOrigin(String locator) {
        assertThatThrownBy(() -> insert("MANUAL", locator))
                .isInstanceOf(SQLException.class)
                .satisfies(error -> assertThat(((SQLException) error).getSQLState()).isEqualTo("23514"));
    }

    @Test
    void rejectsDuplicateSourceOriginPair() throws SQLException {
        insert("MANUAL", "manual:duplicate-fixture");
        assertThatThrownBy(() -> insert("MANUAL", "manual:duplicate-fixture"))
                .isInstanceOf(SQLException.class)
                .satisfies(error -> assertThat(((SQLException) error).getSQLState()).isEqualTo("23505"));
    }

    @Test
    void acceptsSameLocatorForDifferentSourcesAndMultipleNonmanualNullOrigins() throws SQLException {
        long manualId = insert("MANUAL", "manual:shared-fixture");
        long csvId = insert("CSV", "manual:shared-fixture");
        long firstNullId = insert("CSV", null);
        long secondNullId = insert("CSV", null);
        assertThat(manualId).isNotEqualTo(csvId);
        assertThat(firstNullId).isNotEqualTo(secondNullId);
        try (Connection connection = connection(); var statement = connection.createStatement();
             var rows = statement.executeQuery("""
                     SELECT COUNT(*) FROM portfolio_transactions WHERE source = 'CSV' AND origin_locator IS NULL
                     """)) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getLong(1)).isEqualTo(4); // Two legacy rows plus two new rows.
        }
    }

    @Test
    void realAdapterPreservesAcceptedLineageAcrossCommittedPersistenceContextsAndOrdinaryUpdate() {
        PortfolioTransaction input = new PortfolioTransaction(null, 1L, "default", "AAPL",
                PortfolioAssetType.US_STOCK, PortfolioTransactionAction.BUY,
                BigDecimal.ONE, new BigDecimal("100"), "USD", BigDecimal.ZERO,
                BigDecimal.ONE, LocalDate.of(2026, 6, 1), PortfolioTransactionSource.MANUAL,
                "new manual entry", null, null);
        String acceptedLocator = input.originLocator();
        assertThat(acceptedLocator).startsWith("manual:").doesNotStartWith("manual:legacy:");
        PortfolioTransaction accepted;
        try (Session context = sessions.openSession()) {
            context.beginTransaction();
            accepted = adapter(context).save(input);
            context.flush();
            context.clear();
            assertLineage(adapter(context).findByIdAndPortfolioIdAndUserId(accepted.id(), 1L, "default")
                    .orElseThrow(), accepted.id(), acceptedLocator);
            context.getTransaction().commit();
        }
        assertThat(accepted.id()).isPositive();
        assertLineage(accepted, accepted.id(), acceptedLocator);

        try (Session recreated = sessions.openSession()) {
            recreated.beginTransaction();
            PortfolioTransactionRepositoryAdapter adapter = adapter(recreated);
            PortfolioTransaction reloaded = adapter.findByIdAndPortfolioIdAndUserId(accepted.id(), 1L, "default")
                    .orElseThrow();
            assertLineage(reloaded, accepted.id(), acceptedLocator);
            assertThat(adapter.findByPortfolioIdAndUserId(1L, "default"))
                    .filteredOn(transaction -> transaction.id().equals(accepted.id()))
                    .singleElement().satisfies(row -> assertLineage(row, accepted.id(), acceptedLocator));
            // Attempt a normal detached-entity update with a different valid locator.
            adapter.save(new PortfolioTransaction(reloaded.id(), reloaded.portfolioId(), reloaded.userId(),
                    reloaded.symbol(), reloaded.assetType(), reloaded.action(), new BigDecimal("2"),
                    new BigDecimal("125"), reloaded.currency(), reloaded.fee(), reloaded.fxRateToBase(),
                    reloaded.tradeDate(), reloaded.source(), "updated notes", reloaded.createdAt(),
                    reloaded.updatedAt(), "manual:attempted-rewrite"));
            recreated.flush();
            recreated.clear();
            PortfolioTransaction updated = adapter.findByIdAndPortfolioIdAndUserId(accepted.id(), 1L, "default")
                    .orElseThrow();
            assertLineage(updated, accepted.id(), acceptedLocator);
            assertThat(updated.quantity()).isEqualByComparingTo("2");
            assertThat(updated.price()).isEqualByComparingTo("125");
            assertThat(updated.notes()).isEqualTo("updated notes");
            recreated.getTransaction().commit();
        }
        try (Session recreatedAgain = sessions.openSession()) {
            assertLineage(adapter(recreatedAgain).findByIdAndPortfolioIdAndUserId(accepted.id(), 1L, "default")
                    .orElseThrow(), accepted.id(), acceptedLocator);
        }
    }

    private static void assertLineage(PortfolioTransaction row, Long id, String locator) {
        assertThat(row.id()).isEqualTo(id);
        assertThat(row.source()).isEqualTo(PortfolioTransactionSource.MANUAL);
        assertThat(row.originLocator()).isEqualTo(locator);
    }

    private static PortfolioTransactionRepositoryAdapter adapter(Session context) {
        return new PortfolioTransactionRepositoryAdapter(
                new JpaRepositoryFactory(context).getRepository(PortfolioTransactionJpaRepository.class));
    }

    private static void migrateTo(String version) {
        Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration").target(version).load().migrate();
    }

    private static Connection connection() throws SQLException {
        return DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }

    private static String currentMigration() throws SQLException {
        try (Connection connection = connection(); var statement = connection.createStatement();
             var rows = statement.executeQuery("""
                     SELECT version FROM flyway_schema_history WHERE success AND version IS NOT NULL
                     ORDER BY installed_rank DESC LIMIT 1
                     """)) {
            assertThat(rows.next()).isTrue();
            return rows.getString(1);
        }
    }

    private static long insert(String source, String locator) throws SQLException {
        try (Connection connection = connection(); PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO portfolio_transactions
                    (portfolio_id, symbol, asset_type, action, quantity, price, trade_date, source, origin_locator)
                VALUES (1, 'AAPL', 'US_STOCK', 'BUY', 1, 100, DATE '2026-06-01', ?, ?) RETURNING id
                """)) {
            statement.setString(1, source);
            statement.setString(2, locator);
            try (var row = statement.executeQuery()) {
                assertThat(row.next()).isTrue();
                return row.getLong(1);
            }
        }
    }

    private static Map<Long, Map<String, Object>> legacyBusinessRows() throws SQLException {
        try (Connection connection = connection(); var statement = connection.createStatement();
             var rows = statement.executeQuery("""
                     SELECT id, portfolio_id, user_id, symbol, asset_type, action, quantity, price, currency,
                            fee, fx_rate_to_base, trade_date, source, notes, created_at, updated_at
                     FROM portfolio_transactions WHERE id IN (101, 102, 201, 202) ORDER BY id
                     """)) {
            Map<Long, Map<String, Object>> result = new LinkedHashMap<>();
            while (rows.next()) {
                Map<String, Object> fields = new LinkedHashMap<>();
                for (int column = 1; column <= rows.getMetaData().getColumnCount(); column++) {
                    fields.put(rows.getMetaData().getColumnName(column), rows.getObject(column));
                }
                result.put(rows.getLong("id"), fields);
            }
            return result;
        }
    }
}
