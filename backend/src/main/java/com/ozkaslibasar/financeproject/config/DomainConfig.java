package com.ozkaslibasar.financeproject.config;

import com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo.YahooStatementClientAdapter;
import com.ozkaslibasar.financeproject.domain.port.outbound.AgentAnalysisAiPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SentimentDataPort;
import com.ozkaslibasar.financeproject.domain.service.AgentAnalysisUseCase;
import com.ozkaslibasar.financeproject.domain.service.PriceIngestionService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration class to register pure domain services as Spring Beans.
 *
 * <p>This allows the domain layer to remain free of Spring annotations like
 * {@code @Service}, while still participating in the application context.</p>
 *
 * <p>FMP-based beans have been removed. All market data is now sourced from
 * Yahoo Finance (primary) and the local FastAPI data-service (fallback).</p>
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

    @Bean
    public AgentAnalysisUseCase agentAnalysisUseCase(
            YahooStatementClientAdapter yahooStatementClient,
            FinancialDataPort financialDataPort,
            PriceRepositoryPort priceRepositoryPort,
            SentimentDataPort sentimentDataPort,
            AgentAnalysisAiPort agentAnalysisAiPort) {
        return new AgentAnalysisUseCase(
                yahooStatementClient,
                financialDataPort,
                priceRepositoryPort,
                sentimentDataPort,
                agentAnalysisAiPort);
    }
}
