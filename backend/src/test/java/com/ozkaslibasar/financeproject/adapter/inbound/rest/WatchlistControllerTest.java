package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchSnapshot;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.WatchlistPort;
import com.ozkaslibasar.financeproject.domain.service.WatchlistResearchSnapshotUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = WatchlistController.class)
class WatchlistControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private WatchlistPort watchlistPort;

    @MockitoBean
    private WatchlistResearchSnapshotUseCase researchSnapshotUseCase;

    @Test
    void researchSnapshotReturnsPaginatedPartialStatusPayload() throws Exception {
        WatchlistResearchSnapshot snapshot = new WatchlistResearchSnapshot(
                7L,
                "Core",
                1,
                25,
                0,
                List.of("AAPL"),
                List.of(new WatchlistResearchSnapshot.WatchlistResearchRow(
                        "AAPL",
                        WatchlistResearchSnapshot.WatchlistResearchSection.empty(
                                "local-store/provider-chain", "No data returned by provider", Instant.parse("2026-07-10T00:00:00Z")),
                        WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                                WatchlistResearchStatus.RATE_LIMITED,
                                "data-service/technical",
                                "429 rate limit",
                                Instant.parse("2026-07-10T00:00:00Z")),
                        WatchlistResearchSnapshot.WatchlistResearchSection.empty(
                                "research-provider/fundamentals", "No data returned by provider", Instant.parse("2026-07-10T00:00:00Z")),
                        WatchlistResearchSnapshot.WatchlistResearchSection.empty(
                                "research-provider/earnings", "No data returned by provider", Instant.parse("2026-07-10T00:00:00Z")),
                        WatchlistResearchSnapshot.WatchlistResearchSection.empty(
                                "research-provider/institutional", "No data returned by provider", Instant.parse("2026-07-10T00:00:00Z")),
                        WatchlistResearchStatus.RATE_LIMITED)),
                new WatchlistResearchSnapshot.WatchlistResearchPolicy(50, 4, 4000, true, true),
                Instant.parse("2026-07-10T00:00:00Z"));
        when(researchSnapshotUseCase.getSnapshot("default", 7L, 25, 0, List.of("AAPL"), false))
                .thenReturn(snapshot);

        mockMvc.perform(get("/api/v1/watchlists/7/research-snapshot")
                        .param("symbols", "AAPL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.watchlistId").value(7))
                .andExpect(jsonPath("$.rows[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$.rows[0].technical.status").value("RATE_LIMITED"))
                .andExpect(jsonPath("$.policy.providerConcurrencyLimit").value(4));
    }

    /** The wire contract: section field names and the seven status strings stay unchanged. */
    @Test
    void researchSnapshotSerializesSectionFieldsAndTheSevenStatusStrings() throws Exception {
        Instant at = Instant.parse("2026-07-10T00:00:00Z");
        WatchlistResearchSnapshot snapshot = new WatchlistResearchSnapshot(
                7L, "Core", 1, 25, 0, List.of("AAPL"),
                List.of(new WatchlistResearchSnapshot.WatchlistResearchRow(
                        "AAPL",
                        WatchlistResearchSnapshot.WatchlistResearchSection.ok("local-store/provider-chain",
                                new WatchlistResearchSnapshot.PriceSummary(null, null, null, null, null, at), at),
                        WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                                WatchlistResearchStatus.INSUFFICIENT_DATA, "data-service/technical", "Insufficient history", at),
                        WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                                WatchlistResearchStatus.FAILED, "research-provider/fundamentals", "Provider request failed", at),
                        WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                                WatchlistResearchStatus.STALE, "research-provider/earnings", "disabled", at),
                        WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                                WatchlistResearchStatus.PENDING_REFRESH, "research-provider/institutional", "pending", at),
                        WatchlistResearchStatus.EMPTY)),
                new WatchlistResearchSnapshot.WatchlistResearchPolicy(50, 4, 4000, true, true), at);
        when(researchSnapshotUseCase.getSnapshot("default", 7L, 25, 0, List.of(), false)).thenReturn(snapshot);

        mockMvc.perform(get("/api/v1/watchlists/7/research-snapshot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].price.status").value("OK"))
                .andExpect(jsonPath("$.rows[0].technical.status").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.rows[0].technical.message").value("Insufficient history"))
                .andExpect(jsonPath("$.rows[0].technical.source").value("data-service/technical"))
                .andExpect(jsonPath("$.rows[0].technical.observedAt").exists())
                .andExpect(jsonPath("$.rows[0].fundamentals.status").value("FAILED"))
                .andExpect(jsonPath("$.rows[0].earnings.status").value("STALE"))
                .andExpect(jsonPath("$.rows[0].institutional.status").value("PENDING_REFRESH"))
                .andExpect(jsonPath("$.rows[0].overallStatus").value("EMPTY"))
                .andExpect(jsonPath("$.rows[0].technical.data").isEmpty());
        // RATE_LIMITED is covered by researchSnapshotReturnsPaginatedPartialStatusPayload.
    }

    @Test
    void researchSnapshotReturns404WhenWatchlistDoesNotExist() throws Exception {
        when(researchSnapshotUseCase.getSnapshot("default", 404L, 25, 0, List.of(), false))
                .thenThrow(new NoSuchElementException("Watchlist not found: 404"));

        mockMvc.perform(get("/api/v1/watchlists/404/research-snapshot"))
                .andExpect(status().isNotFound());
    }
}