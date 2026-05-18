package com.ozkaslibasar.financeproject.adapter.outbound.scheduler;

import com.ozkaslibasar.financeproject.domain.service.PriceIngestionUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job to orchestrate periodic price ingestion.
 *
 * <p>Strictly delegates to the domain service without any business logic inside
 * the scheduled methods.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PriceIngestionJob {

    private final PriceIngestionUseCase priceIngestionUseCase;

    /**
     * Executes the ingestion process once per day at midnight.
     */
    @Scheduled(cron = "0 0 0 * * ?")
    public void ingestDailyPrices() {
        log.info("Starting daily price ingestion job.");
        priceIngestionUseCase.ingestAll();
        log.info("Finished daily price ingestion job.");
    }

    /**
     * Executes the ingestion process once per hour (at minute 0) for near-real-time
     * updates of intraday price data.
     */
    @Scheduled(cron = "0 0 * * * ?")
    public void ingestHourlyPrices() {
        log.info("Starting hourly price ingestion job.");
        priceIngestionUseCase.ingestAll();
        log.info("Finished hourly price ingestion job.");
    }
}
