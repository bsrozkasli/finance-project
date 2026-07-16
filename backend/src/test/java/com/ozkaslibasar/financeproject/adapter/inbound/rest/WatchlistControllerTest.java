package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.Watchlist;
import com.ozkaslibasar.financeproject.domain.port.outbound.WatchlistPort;
import com.ozkaslibasar.financeproject.domain.service.WatchlistResearchService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
    private WatchlistResearchService watchlistResearchService;

    @Test
    void shouldReturnProviderBackedResearchSnapshotFromUseCase() throws Exception {
        Watchlist watchlist = new Watchlist(10L, "default", "Core", List.of("AAPL", "MSFT"), null, null);
        when(watchlistPort.findByIdAndUserId(10L, "default")).thenReturn(Optional.of(watchlist));
        when(watchlistResearchService.buildSnapshot(eq(watchlist), any(), eq(1), eq(0), eq(false)))
                .thenReturn(new WatchlistResearchService.WatchlistResearchSnapshot(
                        10L,
                        "Core",
                        2,
                        1,
                        0,
                        List.of("AAPL"),
                        List.of(new WatchlistResearchService.WatchlistResearchRow(
                                "AAPL",
                                "Apple Inc.",
                                "STOCK",
                                "NASDAQ",
                                "USD",
                                "Technology",
                                "Consumer Electronics",
                                1_000L,
                                "OK",
                                "data-service",
                                new WatchlistResearchService.WatchlistResearchSection<>(
                                        "OK",
                                        "price-history",
                                        new WatchlistResearchService.WatchlistPriceSummary(210.0, 208.0, 212.0, 207.0, 1000.0, "2026-07-14T00:00:00Z"),
                                        null,
                                        Instant.parse("2026-07-14T00:00:00Z")),
                                new WatchlistResearchService.WatchlistResearchSection<>("EMPTY", "none", null, null, Instant.parse("2026-07-14T00:00:00Z")),
                                new WatchlistResearchService.WatchlistResearchSection<>("EMPTY", "none", null, null, Instant.parse("2026-07-14T00:00:00Z")),
                                new WatchlistResearchService.WatchlistResearchSection<>("EMPTY", "none", null, null, Instant.parse("2026-07-14T00:00:00Z")),
                                new WatchlistResearchService.WatchlistResearchSection<>("EMPTY", "none", null, null, Instant.parse("2026-07-14T00:00:00Z")),
                                "OK")),
                        new WatchlistResearchService.WatchlistResearchPolicy(50, 5, 5000, true, false),
                        Instant.parse("2026-07-14T00:00:00Z")));

        mockMvc.perform(get("/api/v1/watchlists/10/research-snapshot?limit=1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.watchlistId").value(10))
                .andExpect(jsonPath("$.watchlistName").value("Core"))
                .andExpect(jsonPath("$.rows.length()").value(1))
                .andExpect(jsonPath("$.rows[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$.rows[0].name").value("Apple Inc."))
                .andExpect(jsonPath("$.rows[0].overallStatus").value("OK"))
                .andExpect(jsonPath("$.rows[0].price.status").value("OK"));
    }
}