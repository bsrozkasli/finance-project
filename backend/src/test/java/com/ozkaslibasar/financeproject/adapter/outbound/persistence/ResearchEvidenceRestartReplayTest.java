package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.FinanceProjectApplication;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.ClassificationBasis;
import com.ozkaslibasar.financeproject.domain.model.EvidenceFreshness;
import com.ozkaslibasar.financeproject.domain.model.EvidenceMissingness;
import com.ozkaslibasar.financeproject.domain.model.InstrumentIdentity;
import com.ozkaslibasar.financeproject.domain.model.ListingStatus;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceField;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;
import com.ozkaslibasar.financeproject.domain.service.ResearchEvidenceService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * EPIC-001 Task 2 acceptance: "restart/replay resolves the same version". The application context that recorded
 * the snapshots is closed, and a new context (new connection pool, Flyway validation, JPA metadata) is started
 * against the same database. Both run in this JVM, so this proves the database round-trip, not a new OS process.
 */
@Testcontainers(disabledWithoutDocker = true)
class ResearchEvidenceRestartReplayTest {

    private static final Instant T0 = Instant.parse("2026-10-01T10:00:00Z");
    private static final Instant T1 = Instant.parse("2026-10-02T10:00:00Z");

    @Container
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    private static ConfigurableApplicationContext start() {
        return new SpringApplicationBuilder(FinanceProjectApplication.class)
                .profiles("test")
                .properties(
                        "spring.datasource.url=" + POSTGRES.getJdbcUrl(),
                        "spring.datasource.username=" + POSTGRES.getUsername(),
                        "spring.datasource.password=" + POSTGRES.getPassword(),
                        "spring.datasource.driver-class-name=org.postgresql.Driver",
                        "spring.jpa.show-sql=false",
                        "server.port=0")
                .run();
    }

    private static InstrumentIdentity identity(Instant retrievedAt) {
        return new InstrumentIdentity("RESTART", AssetType.STOCK, ListingStatus.UNKNOWN,
                ClassificationBasis.CURRENT_OBSERVATION, "synthetic-test-source", retrievedAt);
    }

    private static ResearchEvidenceField present(String value, Instant retrievedAt) {
        return new ResearchEvidenceField("close", value, null, "synthetic-test-source", retrievedAt.minusSeconds(60),
                retrievedAt, "2026-10-01", "USD", "none", EvidenceFreshness.FRESH, null);
    }

    @Test
    void aNewApplicationContextReplaysEverySnapshotVersionUnchanged() {
        ResearchEvidenceSnapshot first;
        ResearchEvidenceSnapshot second;
        try (ConfigurableApplicationContext before = start()) {
            ResearchEvidenceService service = before.getBean(ResearchEvidenceService.class);
            first = service.record(identity(T0), T0, List.of(present("100.00", T0),
                    new ResearchEvidenceField("volume", null, EvidenceMissingness.PROVIDER_FAILED,
                            "synthetic-test-source", null, T0, null, null, null, EvidenceFreshness.UNKNOWN, null)));
            second = service.revise(first.id(), identity(T1), T1, List.of(present("101.00", T1)));
        }

        try (ConfigurableApplicationContext after = start()) {
            ResearchEvidenceService service = after.getBean(ResearchEvidenceService.class);

            assertThat(service.findById(first.id())).contains(first);
            assertThat(service.findById(second.id())).contains(second);
            assertThat(service.findLatest("RESTART")).contains(second);
        }
    }
}
