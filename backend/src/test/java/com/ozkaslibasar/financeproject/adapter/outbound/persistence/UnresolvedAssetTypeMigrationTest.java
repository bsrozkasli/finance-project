package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Real PostgreSQL upgrade for OQ-5 Phase 3: only rows whose STOCK type was manufactured without
 * classification evidence (metadata UNAVAILABLE) become UNRESOLVED. No provider calls.
 */
@Testcontainers(disabledWithoutDocker = true)
class UnresolvedAssetTypeMigrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @BeforeAll
    static void upgradeFromVersion6() throws SQLException {
        migrateTo("6");
        try (Connection connection = connection(); var statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO assets (symbol, name, type, metadata_status) VALUES
                        ('OLDX', 'OLDX', 'STOCK', 'UNAVAILABLE'),
                        ('AAPL', 'Apple Inc.', 'STOCK', 'VERIFIED'),
                        ('THYAO', 'Turk Hava Yollari', 'STOCK', 'PARTIAL'),
                        ('SPY', 'SPDR S&P 500', 'ETF', 'UNAVAILABLE')
                    """);
        }
        migrateTo("7");
    }

    @Test
    void relabelsOnlyStockRowsWithoutClassificationEvidence() throws SQLException {
        assertThat(assetTypes())
                .containsEntry("OLDX", "UNRESOLVED")
                .containsEntry("AAPL", "STOCK")
                .containsEntry("THYAO", "STOCK")
                .containsEntry("SPY", "ETF");
    }

    @Test
    void keepsNamesAndMetadataStatusSoTheRelabelStaysIdentifiable() throws SQLException {
        try (Connection connection = connection(); var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT name, metadata_status FROM assets WHERE symbol = 'OLDX'")) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getString("name")).isEqualTo("OLDX");
            assertThat(rows.getString("metadata_status")).isEqualTo("UNAVAILABLE");
        }
    }

    private static Map<String, String> assetTypes() throws SQLException {
        Map<String, String> types = new LinkedHashMap<>();
        try (Connection connection = connection(); var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT symbol, type FROM assets ORDER BY symbol")) {
            while (rows.next()) {
                types.put(rows.getString("symbol"), rows.getString("type"));
            }
        }
        return types;
    }

    private static void migrateTo(String version) {
        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .target(version)
                .load()
                .migrate();
    }

    private static Connection connection() throws SQLException {
        return DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }
}
