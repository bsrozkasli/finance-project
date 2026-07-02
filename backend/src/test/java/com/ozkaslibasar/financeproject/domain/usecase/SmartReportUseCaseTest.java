package com.ozkaslibasar.financeproject.domain.usecase;

import com.ozkaslibasar.financeproject.domain.model.SmartReport;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportMarketDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SmartReportUseCaseTest {

    @Mock
    private SmartReportScorePort scorePort;

    @Mock
    private SmartReportMarketDataPort marketDataPort;

    @Test
    void returnsPartialReportWithoutFabricatedHoldWhenScoresAndMetricsUnavailable() {
        SmartReportUseCase useCase = new SmartReportUseCase(scorePort, marketDataPort);
        when(scorePort.fetchCompositeScore("AAPL")).thenReturn(Optional.empty());
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.empty());
        when(marketDataPort.fetchPeers("AAPL")).thenReturn(List.of());

        SmartReport report = useCase.getSmartReport("AAPL");

        assertThat(report.getSymbol()).isEqualTo("AAPL");
        assertThat(report.getOverallScore()).isNull();
        assertThat(report.getGrade()).isNull();
        assertThat(report.getRecommendation()).isNull();
        assertThat(report.getBreakdown().getFundamentalScore()).isNull();
    }
}