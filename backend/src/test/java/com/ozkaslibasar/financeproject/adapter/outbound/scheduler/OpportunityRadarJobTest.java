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

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.slf4j.LoggerFactory;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
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

    @Test
    void shouldTreatAMissingOverallScoreAsNoVerdictInsteadOfAnError() {
        Asset asset = new Asset("ZZZ", "Unscored", com.ozkaslibasar.financeproject.domain.model.AssetType.STOCK);
        when(assetRepositoryPort.findAll()).thenReturn(List.of(asset));
        when(smartReportUseCase.getSmartReport("ZZZ"))
                .thenReturn(SmartReport.builder().symbol("ZZZ").overallScore(null).build());
        Logger logger = (Logger) LoggerFactory.getLogger(OpportunityRadarJob.class);
        ListAppender<ILoggingEvent> events = new ListAppender<>();
        events.start();
        logger.addAppender(events);
        try {
            opportunityRadarJob.runRadar();
        } finally {
            logger.detachAppender(events);
        }

        verify(notificationRepositoryPort, never()).save(any());
        assertThat(events.list).noneMatch(event -> event.getLevel() == Level.ERROR);
    }
}
