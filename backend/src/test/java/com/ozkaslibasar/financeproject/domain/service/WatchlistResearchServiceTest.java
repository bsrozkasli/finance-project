package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.Watchlist;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetMetadataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WatchlistResearchServiceTest {

    @Mock
    private AssetRepositoryPort assetRepositoryPort;
    @Mock
    private AssetMetadataPort assetMetadataPort;
    @Mock
    private PriceRepositoryPort priceRepositoryPort;
    @Mock
    private PriceChartClientPort priceChartClientPort;
    @Mock
    private TechnicalAnalysisPort technicalAnalysisPort;
    @Mock
    private ResearchDataPort researchDataPort;

    @Test
    void shouldBuildPartialProviderBackedSnapshotWithoutFailingWholeRow() {
        WatchlistResearchService service = new WatchlistResearchService(
                assetRepositoryPort,
                assetMetadataPort,
                priceRepositoryPort,
                priceChartClientPort,
                technicalAnalysisPort,
                researchDataPort);

        when(assetMetadataPort.fetchMetadata("PANW")).thenReturn(Optional.of(new AssetMetadataPort.AssetMetadata(
                "PANW", "Palo Alto Networks, Inc.", AssetType.STOCK, "NASDAQ", "USD", "Technology", "Software", 100L, "data-service")));
        when(priceRepositoryPort.findLatestByAssetId("PANW")).thenReturn(Optional.of(new PriceHistory(
                "PANW",
                BigDecimal.valueOf(385.0),
                BigDecimal.valueOf(392.0),
                BigDecimal.valueOf(382.0),
                BigDecimal.valueOf(390.0),
                BigDecimal.valueOf(1_000_000),
                LocalDateTime.parse("2026-07-14T16:00:00"))));
        when(technicalAnalysisPort.fetchTechnicalAnalysis("PANW", "1d", "6mo")).thenReturn(Optional.of(
                new TechnicalAnalysisPort.TechnicalAnalysisResult(
                        "PANW", "2026-07-14T00:00:00Z", 51.2, 1.5, 1.1, 0.4,
                        null, null, null, 2.1, 380.0, 380.0, 375.0, null, 379.0, null, null)));
        when(technicalAnalysisPort.fetchTechnicalSignals("PANW", "1d", "6mo")).thenReturn(Optional.of(
                new TechnicalAnalysisPort.TechnicalAnalysisResult(
                        "PANW", "2026-07-14T00:00:00Z", null, null, null, null,
                        null, null, null, null, null, null, null, null, null, "BUY", 0.67)));
        when(researchDataPort.fetchFundamental("PANW")).thenReturn(Optional.of(new ResearchDataPort.FundamentalResearch(
                "PANW",
                new ResearchDataPort.FundamentalMetrics(0.21, 0.09, 0.14, 0.72, 0.31, 0.18, 1.4, 1.1, 0.8, 9_000_000.0, 1_200_000.0, 1_800_000.0),
                "2025",
                "USD",
                "2026-07-14T00:00:00Z")));
        when(researchDataPort.fetchEarnings("PANW")).thenReturn(List.of());
        when(researchDataPort.fetchInstitutionalScores("PANW")).thenThrow(new RuntimeException("provider down"));

        WatchlistResearchService.WatchlistResearchSnapshot snapshot = service.buildSnapshot(
                new Watchlist(1L, "default", "Core", List.of("PANW"), null, null),
                null,
                50,
                0,
                false);

        WatchlistResearchService.WatchlistResearchRow row = snapshot.rows().get(0);
        assertThat(row.name()).isEqualTo("Palo Alto Networks, Inc.");
        assertThat(row.price().status()).isEqualTo("OK");
        assertThat(row.price().data().lastPrice()).isEqualTo(390.0);
        assertThat(row.technical().data().sma50()).isEqualTo(375.0);
        assertThat(row.technical().data().action()).isEqualTo("BUY");
        assertThat(row.fundamentals().status()).isEqualTo("OK");
        assertThat(row.earnings().status()).isEqualTo("EMPTY");
        assertThat(row.institutional().status()).isEqualTo("FAILED");
        assertThat(row.overallStatus()).isEqualTo("OK");
    }
}

