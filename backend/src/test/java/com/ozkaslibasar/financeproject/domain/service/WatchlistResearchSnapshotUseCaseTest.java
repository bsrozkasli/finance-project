package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.Watchlist;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchSnapshot;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.WatchlistPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WatchlistResearchSnapshotUseCaseTest {

    private WatchlistPort watchlistPort;
    private PriceRefreshService priceRefreshService;
    private TechnicalAnalysisPort technicalAnalysisPort;
    private ResearchDataPort researchDataPort;
    private WatchlistResearchSnapshotUseCase useCase;

    @BeforeEach
    void setUp() {
        watchlistPort = mock(WatchlistPort.class);
        priceRefreshService = mock(PriceRefreshService.class);
        technicalAnalysisPort = mock(TechnicalAnalysisPort.class);
        researchDataPort = mock(ResearchDataPort.class);
        useCase = new WatchlistResearchSnapshotUseCase(
                watchlistPort,
                priceRefreshService,
                technicalAnalysisPort,
                researchDataPort);
    }

    @Test
    void snapshotFiltersRequestedSymbolsAndPaginatesInWatchlistOrder() {
        Watchlist watchlist = new Watchlist(10L, "default", "Core", List.of("MSFT", "AAPL", "GOOG"), null, null);
        when(watchlistPort.findByIdAndUserId(10L, "default")).thenReturn(Optional.of(watchlist));
        when(priceRefreshService.getFreshLatest("AAPL")).thenReturn(Optional.empty());
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.empty());
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.empty());
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(List.of());
        when(researchDataPort.fetchInstitutionalScores("AAPL")).thenReturn(Optional.empty());

        WatchlistResearchSnapshot snapshot = useCase.getSnapshot(
                "default",
                10L,
                1,
                1,
                List.of("aapl", "msft"),
                false);

        assertThat(snapshot.totalSymbols()).isEqualTo(2);
        assertThat(snapshot.requestedSymbols()).containsExactly("MSFT", "AAPL");
        assertThat(snapshot.rows()).hasSize(1);
        WatchlistResearchSnapshot.WatchlistResearchRow row = snapshot.rows().get(0);
        assertThat(row.symbol()).isEqualTo("AAPL");
        assertThat(row.price().status()).isEqualTo(WatchlistResearchStatus.EMPTY);
        assertThat(row.overallStatus()).isEqualTo(WatchlistResearchStatus.EMPTY);
        assertThat(snapshot.policy().maxLimit()).isEqualTo(50);
        assertThat(snapshot.policy().partialFailureEnabled()).isTrue();
    }

    @Test
    void snapshotReturnsPartialDataWhenOneProviderSectionFails() {
        Watchlist watchlist = new Watchlist(11L, "default", "Growth", List.of("AAPL"), null, null);
        ResearchDataPort.FundamentalMetrics metrics = new ResearchDataPort.FundamentalMetrics(
                0.22, 0.12, 0.18, 0.44, 0.31, 0.24, 1.9, 1.4, 0.52, 1000.0, 240.0, 300.0);
        ResearchDataPort.FundamentalResearch fundamental = new ResearchDataPort.FundamentalResearch(
                "AAPL", metrics, "2025", "USD", "2026-07-10T00:00:00Z");
        PriceHistory price = new PriceHistory(
                "AAPL",
                BigDecimal.valueOf(190),
                BigDecimal.valueOf(195),
                BigDecimal.valueOf(188),
                BigDecimal.valueOf(194),
                BigDecimal.valueOf(123456),
                LocalDateTime.of(2026, 7, 10, 15, 30));

        when(watchlistPort.findByIdAndUserId(11L, "default")).thenReturn(Optional.of(watchlist));
        when(priceRefreshService.getFreshLatest("AAPL")).thenReturn(Optional.of(price));
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo"))
                .thenThrow(new RuntimeException("429 rate limit"));
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.of(fundamental));
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(List.of());
        when(researchDataPort.fetchInstitutionalScores("AAPL")).thenReturn(Optional.empty());

        WatchlistResearchSnapshot snapshot = useCase.getSnapshot("default", 11L, 25, 0, List.of(), false);

        WatchlistResearchSnapshot.WatchlistResearchRow row = snapshot.rows().get(0);
        assertThat(row.price().status()).isEqualTo(WatchlistResearchStatus.OK);
        assertThat(row.price().data().lastPrice()).isEqualByComparingTo("194");
        assertThat(row.technical().status()).isEqualTo(WatchlistResearchStatus.RATE_LIMITED);
        assertThat(row.fundamentals().status()).isEqualTo(WatchlistResearchStatus.OK);
        assertThat(row.fundamentals().data().roe()).isEqualTo(0.22);
        assertThat(row.overallStatus()).isEqualTo(WatchlistResearchStatus.RATE_LIMITED);
    }
}