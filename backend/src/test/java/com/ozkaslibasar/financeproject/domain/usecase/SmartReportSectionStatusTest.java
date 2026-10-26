package com.ozkaslibasar.financeproject.domain.usecase;

import com.ozkaslibasar.financeproject.domain.model.SmartReport;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportMarketDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort.ComponentAvailability;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SmartReportSectionStatusTest {

    @Mock
    private SmartReportScorePort scorePort;

    @Mock
    private SmartReportMarketDataPort marketDataPort;

    private static SmartReportScorePort.ScoreBreakdown breakdown() {
        return new SmartReportScorePort.ScoreBreakdown(50, null, 50, 50, 50, 50, 50, 70);
    }

    @Test
    void compositeAvailabilityFlowsThroughToSectionStatus() {
        SmartReportUseCase useCase = new SmartReportUseCase(scorePort, marketDataPort);
        when(scorePort.fetchCompositeScore("AAPL")).thenReturn(Optional.of(new SmartReportScorePort.CompositeScore(
                51, "C", "Hold", breakdown(),
                Map.of("fundamental_score", new ComponentAvailability("available", null),
                        "valuation_score", new ComponentAvailability("unavailable", "valuation_component_unavailable")),
                List.of("valuation"))));
        when(marketDataPort.fetchPeers("AAPL")).thenReturn(List.of());
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.empty());

        SmartReport report = useCase.getSmartReport("AAPL");

        assertThat(report.getSectionStatus().overall()).isEqualTo(WatchlistResearchStatus.EMPTY);
        assertThat(report.getSectionStatus().components().get("fundamental_score").status())
                .isEqualTo(WatchlistResearchStatus.OK);
        assertThat(report.getSectionStatus().components().get("valuation_score").status())
                .isEqualTo(WatchlistResearchStatus.EMPTY);
        assertThat(report.getSectionStatus().components().get("valuation_score").reason())
                .isEqualTo("valuation_component_unavailable");
    }

    @Test
    void compositeWithoutAvailabilityLeavesSectionStatusNull() {
        SmartReportUseCase useCase = new SmartReportUseCase(scorePort, marketDataPort);
        when(scorePort.fetchCompositeScore("AAPL")).thenReturn(Optional.of(new SmartReportScorePort.CompositeScore(
                51, "C", "Hold", breakdown())));
        when(marketDataPort.fetchPeers("AAPL")).thenReturn(List.of());
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.empty());

        assertThat(useCase.getSmartReport("AAPL").getSectionStatus()).isNull();
    }

    @Test
    void finnhubFallbackIsInsufficientDataNeverOk() {
        SmartReportUseCase useCase = new SmartReportUseCase(scorePort, marketDataPort);
        when(scorePort.fetchCompositeScore("AAPL")).thenReturn(Optional.empty());
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(
                Optional.of(new SmartReportMarketDataPort.CompanyMetrics(12.0, 3.0, 0.5, 0.25, 0.25, 0.01)));
        when(marketDataPort.fetchPeers("AAPL")).thenReturn(List.of());

        SmartReport report = useCase.getSmartReport("AAPL");

        assertThat(report.getOverallScore()).isNotNull();
        assertThat(report.getSectionStatus().overall()).isEqualTo(WatchlistResearchStatus.INSUFFICIENT_DATA);
        assertThat(report.getSectionStatus().components()).hasSize(8);
        assertThat(report.getSectionStatus().components().values()).allSatisfy(c -> {
            assertThat(c.status()).isEqualTo(WatchlistResearchStatus.INSUFFICIENT_DATA);
            assertThat(c.reason()).isEqualTo("fallback_source_used");
        });
    }

    @Test
    void fallbackWithNoMetricsAtAllIsStillInsufficientNeverOk() {
        SmartReportUseCase useCase = new SmartReportUseCase(scorePort, marketDataPort);
        when(scorePort.fetchCompositeScore("AAPL")).thenReturn(Optional.empty());
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.empty());
        when(marketDataPort.fetchPeers("AAPL")).thenReturn(List.of());

        assertThat(useCase.getSmartReport("AAPL").getSectionStatus().overall())
                .isEqualTo(WatchlistResearchStatus.INSUFFICIENT_DATA);
    }
}
