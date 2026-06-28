package com.ozkaslibasar.financeproject.adapter.outbound.scheduler;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.OpportunityNotification;
import com.ozkaslibasar.financeproject.domain.model.SmartReport;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.NotificationRepositoryPort;
import com.ozkaslibasar.financeproject.domain.usecase.SmartReportUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OpportunityRadarJob {

    private final AssetRepositoryPort assetRepositoryPort;
    private final SmartReportUseCase smartReportUseCase;
    private final NotificationRepositoryPort notificationRepositoryPort;

    /**
     * Runs every night at 01:00 to analyze the watchlist and find opportunities.
     */
    @Scheduled(cron = "0 0 1 * * ?")
    public void runRadar() {
        log.info("Starting Opportunity Radar Job...");
        
        List<Asset> trackedAssets = assetRepositoryPort.findAll();
        for (Asset asset : trackedAssets) {
            try {
                SmartReport report = smartReportUseCase.getSmartReport(asset.symbol());
                
                // If overall score is >= 80, it's a strong opportunity
                if (report != null && report.getOverallScore() >= 80) {
                    createNotification(asset.symbol(), report.getOverallScore());
                }
            } catch (Exception e) {
                log.error("Error analyzing asset {} during Opportunity Radar Job", asset.symbol(), e);
            }
        }
        
        log.info("Finished Opportunity Radar Job.");
    }

    private void createNotification(String symbol, int score) {
        String message = String.format("Fırsat Yakalandı! %s hissesi %d/100 Akıllı Rapor skoru ile Güçlü Alım (A+) bölgesine girdi. Raporu hemen inceleyin.", symbol, score);
        
        OpportunityNotification notification = OpportunityNotification.builder()
                .symbol(symbol)
                .score(score)
                .message(message)
                .createdAt(LocalDateTime.now())
                .isRead(false)
                .build();
                
        notificationRepositoryPort.save(notification);
        log.info("Created notification for symbol {} with score {}", symbol, score);
    }
}
