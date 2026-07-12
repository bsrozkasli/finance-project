package com.ozkaslibasar.financeproject.config;

import com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo.YahooStatementClientAdapter;
import com.ozkaslibasar.financeproject.domain.port.outbound.AgentAnalysisAiPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.MarketCalendarPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SentimentDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportMarketDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SymbolMappingPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.WatchlistPort;
import com.ozkaslibasar.financeproject.domain.service.AgentAnalysisUseCase;
import com.ozkaslibasar.financeproject.domain.service.AssetResolutionService;
import com.ozkaslibasar.financeproject.domain.service.PriceIngestionService;
import com.ozkaslibasar.financeproject.domain.service.PriceNormalizationService;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import com.ozkaslibasar.financeproject.domain.service.WatchlistResearchSnapshotUseCase;
import com.ozkaslibasar.financeproject.domain.usecase.SmartReportUseCase;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration class to register pure domain services as Spring Beans.
 *
 * <p>This allows the domain layer to remain free of Spring annotations like
 * {@code @Service}, while still participating in the application context.</p>
 * <p>Market data is sourced from Yahoo Finance, Tiingo where configured,
 * and the local FastAPI data-service fallback.</p>
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
            AssetRepositoryPort assetRepositoryPort,
            PriceRepositoryPort priceRepositoryPort,
            PriceChartClientPort priceChartClientPort) {
        return new PriceIngestionService(
                assetRepositoryPort, priceRepositoryPort, priceChartClientPort);
    }

    @Bean
    public PriceNormalizationService priceNormalizationService() {
        return new PriceNormalizationService();
    }

    @Bean
    public AssetResolutionService assetResolutionService(
            SymbolMappingPort symbolMappingPort,
            PriceChartClientPort priceChartClientPort) {
        return new AssetResolutionService(symbolMappingPort, priceChartClientPort);
    }

    @Bean
    public PriceRefreshService priceRefreshService(
            PriceRepositoryPort priceRepositoryPort,
            FinancialDataPort financialDataPort) {
        return new PriceRefreshService(priceRepositoryPort, financialDataPort);
    }

    @Bean
    public WatchlistResearchSnapshotUseCase watchlistResearchSnapshotUseCase(
            WatchlistPort watchlistPort,
            PriceRefreshService priceRefreshService,
            TechnicalAnalysisPort technicalAnalysisPort,
            ResearchDataPort researchDataPort) {
        return new WatchlistResearchSnapshotUseCase(
                watchlistPort,
                priceRefreshService,
                technicalAnalysisPort,
                researchDataPort);
    }

    @Bean
    public PortfolioLedgerService portfolioLedgerService(PortfolioTransactionPort transactionPort) {
        return new PortfolioLedgerService(transactionPort);
    }

    @Bean
    public AgentAnalysisUseCase agentAnalysisUseCase(
            YahooStatementClientAdapter yahooStatementClient,
            FinancialDataPort financialDataPort,
            PriceRepositoryPort priceRepositoryPort,
            SentimentDataPort sentimentDataPort,
            MarketCalendarPort marketCalendarPort,
            AgentAnalysisAiPort agentAnalysisAiPort) {
        return new AgentAnalysisUseCase(
                yahooStatementClient,
                financialDataPort,
                priceRepositoryPort,
                sentimentDataPort,
                marketCalendarPort,
                agentAnalysisAiPort);
    }

    @Bean
    public SmartReportUseCase smartReportUseCase(
            SmartReportScorePort smartReportScorePort,
            SmartReportMarketDataPort smartReportMarketDataPort) {
        return new SmartReportUseCase(smartReportScorePort, smartReportMarketDataPort);
    }
}