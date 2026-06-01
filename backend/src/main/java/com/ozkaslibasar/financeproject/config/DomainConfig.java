package com.ozkaslibasar.financeproject.config;

import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.service.PriceIngestionService;
import com.ozkaslibasar.financeproject.domain.service.PriceIngestionUseCase;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration class to register pure domain services as Spring Beans.
 *
 * <p>This allows the domain layer to remain free of Spring annotations like
 * {@code @Service}, while still participating in the application context.</p>
 */
@Configuration
public class DomainConfig {

    /**
     * Registers {@link PriceIngestionService} (Yahoo-backed) as a bean.
     *
     * <p>This is the primary ingestion service used by the scheduler.
     * It delegates to {@link PriceChartClientPort} (Yahoo Finance) for price data.</p>
     */
    @Bean
    public PriceIngestionService priceIngestionService(
            AssetRepositoryPort  assetRepositoryPort,
            PriceRepositoryPort  priceRepositoryPort,
            PriceChartClientPort priceChartClientPort) {
        return new PriceIngestionService(
                assetRepositoryPort, priceRepositoryPort, priceChartClientPort);
    }

    /**
     * Keeps the legacy {@link PriceIngestionUseCase} (FMP-backed) as a bean
     * for backward compatibility with existing controllers and batch endpoints
     * that call FMP for initial asset bootstrap.
     *
     * @deprecated Prefer {@link PriceIngestionService} for new use cases.
     *             This bean will be removed once all callers migrate to Yahoo.
     */
    @Deprecated
    @Bean
    public PriceIngestionUseCase priceIngestionUseCase(
            AssetRepositoryPort    assetRepositoryPort,
            PriceRepositoryPort    priceRepositoryPort,
            FinancialDataClientPort financialDataClientPort) {
        return new PriceIngestionUseCase(
                assetRepositoryPort, priceRepositoryPort, financialDataClientPort);
    }
}
