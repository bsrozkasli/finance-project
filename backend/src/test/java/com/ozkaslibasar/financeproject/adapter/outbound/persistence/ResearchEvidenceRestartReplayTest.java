package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.FinanceProjectApplication;
import com.ozkaslibasar.financeproject.domain.model.EvidenceField;
import com.ozkaslibasar.financeproject.domain.model.EvidenceFreshness;
import com.ozkaslibasar.financeproject.domain.model.EvidenceMissingness;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchEvidencePort;
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
 * EPIC-001 Task 2 acceptance: "Restart/replay resolves the same version; revising creates a new ID and preserves
 * prior fields." A restart is simulated by closing the whole application context (adapter, JPA session, connection
 * pool) and starting a brand-new one against the same PostgreSQL container, so nothing can be served from memory.
 */
@Testcontainers(disabledWithoutDocker = true)
class ResearchEvidenceRestartReplayTest {

    private static final String SYMBOL = "EVRESTART";
    private static final Instant T0 = Instant.parse("2026-10-01T10:00:00Z");
    private static final Instant T1 = Instant.parse("2026-10-02T10:00:00Z");

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    private static ConfigurableApplicationContext startApplication() {
        return new SpringApplicationBuilder(FinanceProjectApplication.class)
                .profiles("test")
                .properties(
                        "spring.datasource.url=" + postgres.getJdbcUrl(),
                        "spring.datasource.username=" + postgres.getUsername(),
                        "spring.datasource.password=" + postgres.getPassword(),
                        "spring.datasource.driver-class-name=org.postgresql.Driver",
                        "spring.main.web-application-type=none")
                .run();
    }

    private static EvidenceField present(String name, String value, Instant retrievedAt) {
        return new EvidenceField(name, value, EvidenceMissingness.NONE, "yfinance", retrievedAt.minusSeconds(60),
                retrievedAt, "TTM", "USD", "as-reported", EvidenceFreshness.FRESH, false);
    }

    private static EvidenceField missing(String name, Instant retrievedAt) {
        return new EvidenceField(name, null, EvidenceMissingness.PROVIDER_FAILED, "yfinance", null, retrievedAt,
                null, null, null, EvidenceFreshness.UNKNOWN, false);
    }

    @Test
    void snapshotAndRevisionReplayIdenticallyAfterRestartWithPriorRevisionIntact() {
        ResearchEvidenceSnapshot first;
        ResearchEvidenceSnapshot second;
        try (ConfigurableApplicationContext beforeRestart = startApplication()) {
            ResearchEvidenceService service = beforeRestart.getBean(ResearchEvidenceService.class);
            first = service.record(SYMBOL,
                    List.of(present("pe", "28.4", T0), missing("eps", T0), present("beta", "1.2", T0)), T0);
            second = service.revise(first.id(),
                    List.of(present("pe", "30.1", T1), missing("eps", T1), present("beta", "1.3", T1)), T1);
        }

        try (ConfigurableApplicationContext afterRestart = startApplication()) {
            ResearchEvidencePort port = afterRestart.getBean(ResearchEvidencePort.class);

            ResearchEvidenceSnapshot replayedFirst = port.findById(first.id()).orElseThrow();
            ResearchEvidenceSnapshot replayedSecond = port.findById(second.id()).orElseThrow();

            assertThat(replayedFirst).isEqualTo(first);
            assertThat(replayedSecond).isEqualTo(second);
            assertThat(port.findLatestBySymbol(SYMBOL)).contains(second);

            assertThat(replayedSecond.id()).isNotEqualTo(replayedFirst.id());
            assertThat(replayedSecond.revision()).isEqualTo(replayedFirst.revision() + 1);
            assertThat(replayedSecond.supersedesId()).contains(replayedFirst.id());

            assertThat(replayedFirst.fields()).extracting(EvidenceField::name).containsExactly("pe", "eps", "beta");
            assertThat(replayedFirst.fields().get(0).value()).isEqualTo("28.4");
            assertThat(replayedFirst.fields().get(1).value()).isNull();
            assertThat(replayedFirst.fields().get(1).missingness()).isEqualTo(EvidenceMissingness.PROVIDER_FAILED);
            assertThat(replayedSecond.fields().get(0).value()).isEqualTo("30.1");
        }
    }
}
