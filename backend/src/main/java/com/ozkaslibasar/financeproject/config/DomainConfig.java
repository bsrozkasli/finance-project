package com.ozkaslibasar.financeproject.config;

import com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo.YahooStatementClientAdapter;
import com.ozkaslibasar.financeproject.domain.port.outbound.AgentAnalysisAiPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetDetailDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialHistoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.JournalTradePort;
import com.ozkaslibasar.financeproject.domain.port.outbound.MarketCalendarPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioCsvImportPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioLedgerLockPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioStatePort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchEvidencePort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SentimentDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportMarketDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SymbolMappingPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.WatchlistPort;
import com.ozkaslibasar.financeproject.domain.service.AgentAnalysisUseCase;
import com.ozkaslibasar.financeproject.domain.service.AssetResolutionService;
import com.ozkaslibasar.financeproject.domain.service.AssetResearchDetailUseCase;
import com.ozkaslibasar.financeproject.domain.service.FinancialHistoryService;
import com.ozkaslibasar.financeproject.domain.service.JournalTradeService;
import com.ozkaslibasar.financeproject.domain.service.PriceIngestionService;
import com.ozkaslibasar.financeproject.domain.service.PriceNormalizationService;
import com.ozkaslibasar.financeproject.domain.service.PortfolioCsvImportService;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import com.ozkaslibasar.financeproject.domain.service.PortfolioStateService;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import com.ozkaslibasar.financeproject.domain.service.ResearchEvidenceService;
import com.ozkaslibasar.financeproject.domain.service.WatchlistResearchSnapshotUseCase;
import com.ozkaslibasar.financeproject.domain.usecase.SmartReportUseCase;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

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
    public AssetResearchDetailUseCase assetResearchDetailUseCase(AssetDetailDataPort assetDetailDataPort) {
        return new AssetResearchDetailUseCase(assetDetailDataPort);
    }
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
    public ResearchEvidenceService researchEvidenceService(ResearchEvidencePort researchEvidencePort) {
        return new ResearchEvidenceService(researchEvidencePort, java.util.UUID::randomUUID);
    }

    @Bean
    public PortfolioLedgerService portfolioLedgerService(PortfolioTransactionPort transactionPort,
                                                         PortfolioLedgerLockPort ledgerLockPort) {
        return new PortfolioLedgerService(transactionPort, ledgerLockPort);
    }

    @Bean
    public PortfolioCsvImportService portfolioCsvImportService(PortfolioCsvImportPort csvImportPort,
                                                               PortfolioTransactionPort transactionPort,
                                                               PortfolioLedgerService portfolioLedgerService,
                                                               Clock clock) {
        return new PortfolioCsvImportService(csvImportPort, transactionPort, portfolioLedgerService, clock);
    }

    @Bean
    public PortfolioStateService portfolioStateService(PortfolioTransactionPort transactionPort,
                                                       PortfolioLedgerService portfolioLedgerService,
                                                       PriceRepositoryPort priceRepositoryPort,
                                                       AssetRepositoryPort assetRepositoryPort,
                                                       PortfolioPort portfolioPort,
                                                       PortfolioStatePort portfolioStatePort) {
        return new PortfolioStateService(transactionPort, portfolioLedgerService, priceRepositoryPort,
                assetRepositoryPort, portfolioPort, portfolioStatePort);
    }

    @Bean
    public JournalTradeService journalTradeService(
            JournalTradePort journalTradePort,
            PriceRefreshService priceRefreshService) {
        return new JournalTradeService(journalTradePort, priceRefreshService);
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

    @Bean
    public FinancialHistoryService financialHistoryService(FinancialHistoryPort financialHistoryPort) {
        return new FinancialHistoryService(financialHistoryPort);
    }
}
