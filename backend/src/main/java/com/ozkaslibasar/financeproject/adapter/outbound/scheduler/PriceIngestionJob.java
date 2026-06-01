package com.ozkaslibasar.financeproject.adapter.outbound.scheduler;

import com.ozkaslibasar.financeproject.domain.service.PriceIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled adapter triggering the daily price ingestion via Yahoo Finance.
 *
 * <p>Per CONTRIBUTING.md, {@code @Scheduled} method bodies must contain
 * only a single service call — no business logic permitted here.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PriceIngestionJob {

    private final PriceIngestionService priceIngestionService;

    /**
     * Triggers daily OHLCV ingestion for all registered assets at midnight UTC.
     *
     * <p>Uses the default interval ({@code 1d}) and range ({@code 1y}) defined
     * in {@link PriceIngestionService}.</p>
     */
    @Scheduled(cron = "0 0 0 * * ?")
    public void ingestDailyPrices() {
        priceIngestionService.ingestAll();
    }
}
