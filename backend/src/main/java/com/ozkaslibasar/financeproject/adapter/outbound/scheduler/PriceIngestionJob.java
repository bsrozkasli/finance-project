package com.ozkaslibasar.financeproject.adapter.outbound.scheduler;

import com.ozkaslibasar.financeproject.domain.service.PriceIngestionUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job to orchestrate daily price ingestion.
 *
 * <p>Strictly delegates to the domain service without any business logic inside the scheduled method.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PriceIngestionJob {

    private final PriceIngestionUseCase priceIngestionUseCase;

    /**
     * Executes the ingestion process once per day at midnight.
     * <p>Alternatively, could use a fixed rate if desired.</p>
     */
    @Scheduled(cron = "0 0 0 * * ?") // Every day at midnight
    public void ingestDailyPrices() {
        log.info("Starting daily price ingestion job.");
        priceIngestionUseCase.ingestAll();
        log.info("Finished daily price ingestion job.");
    }
}
