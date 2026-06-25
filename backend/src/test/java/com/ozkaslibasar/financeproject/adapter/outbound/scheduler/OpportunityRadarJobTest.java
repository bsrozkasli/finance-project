package com.ozkaslibasar.financeproject.adapter.outbound.scheduler;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.SmartReport;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.NotificationRepositoryPort;
import com.ozkaslibasar.financeproject.domain.usecase.SmartReportUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OpportunityRadarJobTest {

    @Mock
    private AssetRepositoryPort assetRepositoryPort;

    @Mock
    private SmartReportUseCase smartReportUseCase;

    @Mock
    private NotificationRepositoryPort notificationRepositoryPort;

    @InjectMocks
    private OpportunityRadarJob opportunityRadarJob;

    @BeforeEach
    void setUp() {
    }

    @Test
    void shouldCreateNotificationForScoreGreaterThan80() {
        // Given
        Asset asset1 = new Asset("AAPL", "Apple", com.ozkaslibasar.financeproject.domain.model.AssetType.STOCK);
        Asset asset2 = new Asset("TSLA", "Tesla", com.ozkaslibasar.financeproject.domain.model.AssetType.STOCK);

        when(assetRepositoryPort.findAll()).thenReturn(List.of(asset1, asset2));

        SmartReport report1 = SmartReport.builder().symbol("AAPL").overallScore(85).build();
        when(smartReportUseCase.getSmartReport("AAPL")).thenReturn(report1);

        SmartReport report2 = SmartReport.builder().symbol("TSLA").overallScore(75).build();
        when(smartReportUseCase.getSmartReport("TSLA")).thenReturn(report2);

        // When
        opportunityRadarJob.runRadar();

        // Then
        verify(notificationRepositoryPort, times(1)).save(any());
    }
}
