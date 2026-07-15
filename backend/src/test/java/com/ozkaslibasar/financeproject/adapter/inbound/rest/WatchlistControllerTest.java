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

    @Test
    void researchSnapshotReturns404WhenWatchlistDoesNotExist() throws Exception {
        when(researchSnapshotUseCase.getSnapshot("default", 404L, 25, 0, List.of(), false))
                .thenThrow(new NoSuchElementException("Watchlist not found: 404"));

        mockMvc.perform(get("/api/v1/watchlists/404/research-snapshot"))
                .andExpect(status().isNotFound());
    }
}