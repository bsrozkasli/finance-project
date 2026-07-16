package com.ozkaslibasar.financeproject.config;

import com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo.YahooStatementClientAdapter;
import com.ozkaslibasar.financeproject.domain.port.outbound.AgentAnalysisAiPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.JournalTradePort;
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
import com.ozkaslibasar.financeproject.domain.service.JournalTradeService;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import com.ozkaslibasar.financeproject.domain.service.PriceIngestionService;
import com.ozkaslibasar.financeproject.domain.service.PriceNormalizationService;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import com.ozkaslibasar.financeproject.domain.service.WatchlistResearchSnapshotUseCase;
import com.ozkaslibasar.financeproject.domain.usecase.SmartReportUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@SpringBootTest(classes = DomainConfigWiringTest.TestApplication.class)
/** EXPECTED_SOURCE_DEFAULT: mirrors_implementation (RISKLI) */
class DomainConfigWiringTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private AssetRepositoryPort assetRepositoryPort;

    @Autowired
    private PriceRepositoryPort priceRepositoryPort;

    @Autowired
    private PriceChartClientPort priceChartClientPort;

    @Autowired
    private FinancialDataPort financialDataPort;

    @Autowired
    private PortfolioTransactionPort portfolioTransactionPort;

    @Autowired
    private JournalTradePort journalTradePort;

    @Autowired
    private YahooStatementClientAdapter yahooStatementClientAdapter;

    @Autowired
    private SentimentDataPort sentimentDataPort;

    @Autowired
    private MarketCalendarPort marketCalendarPort;

    @Autowired
    private AgentAnalysisAiPort agentAnalysisAiPort;

    @Autowired
    private SmartReportScorePort smartReportScorePort;

    @Autowired
    private SmartReportMarketDataPort smartReportMarketDataPort;

    @Autowired
    private SymbolMappingPort symbolMappingPort;

    @Autowired
    private WatchlistPort watchlistPort;

    @Autowired
    private TechnicalAnalysisPort technicalAnalysisPort;

    @Autowired
    private ResearchDataPort researchDataPort;

    @Autowired
    private PriceIngestionService priceIngestionService;

    @Autowired
    private PriceNormalizationService priceNormalizationService;

    @Autowired
    private AssetResolutionService assetResolutionService;

    @Autowired
    private PriceRefreshService priceRefreshService;

    @Autowired
    private WatchlistResearchSnapshotUseCase watchlistResearchSnapshotUseCase;

    @Autowired
    private PortfolioLedgerService portfolioLedgerService;

    @Autowired
    private JournalTradeService journalTradeService;

    @Autowired
    private AgentAnalysisUseCase agentAnalysisUseCase;

    @Autowired
    private SmartReportUseCase smartReportUseCase;

    @Test
    void should_wirePriceIngestionService_with_allDependencies() {
        assertThat(priceIngestionService).isNotNull();
        assertThat(ReflectionTestUtils.getField(priceIngestionService, "assetRepository")).isSameAs(assetRepositoryPort);
        assertThat(ReflectionTestUtils.getField(priceIngestionService, "priceRepository")).isSameAs(priceRepositoryPort);
        assertThat(ReflectionTestUtils.getField(priceIngestionService, "chartClient")).isSameAs(priceChartClientPort);
    }

    @Test
    void should_wireAssetResolutionService_with_dependencies() {
        assertThat(assetResolutionService).isNotNull();
        assertThat(ReflectionTestUtils.getField(assetResolutionService, "symbolMappingPort")).isSameAs(symbolMappingPort);
        assertThat(ReflectionTestUtils.getField(assetResolutionService, "priceChartClientPort")).isSameAs(priceChartClientPort);
    }

    @Test
    void should_wirePriceNormalizationService() {
        assertThat(priceNormalizationService).isNotNull();
        assertThat(priceNormalizationService).isInstanceOf(PriceNormalizationService.class);
    }

    @Test
    void should_wirePriceRefreshService_with_dependencies() {
        assertThat(priceRefreshService).isNotNull();
        assertThat(ReflectionTestUtils.getField(priceRefreshService, "priceRepository")).isSameAs(priceRepositoryPort);
        assertThat(ReflectionTestUtils.getField(priceRefreshService, "financialDataPort")).isSameAs(financialDataPort);
    }

    @Test
    void should_wireWatchlistResearchSnapshotUseCase_with_dependencies() {
        assertThat(watchlistResearchSnapshotUseCase).isNotNull();
        assertThat(ReflectionTestUtils.getField(watchlistResearchSnapshotUseCase, "watchlistPort")).isSameAs(watchlistPort);
        assertThat(ReflectionTestUtils.getField(watchlistResearchSnapshotUseCase, "priceRefreshService")).isSameAs(priceRefreshService);
        assertThat(ReflectionTestUtils.getField(watchlistResearchSnapshotUseCase, "technicalAnalysisPort")).isSameAs(technicalAnalysisPort);
        assertThat(ReflectionTestUtils.getField(watchlistResearchSnapshotUseCase, "researchDataPort")).isSameAs(researchDataPort);
    }
    @Test
    void should_wirePortfolioLedgerService_with_transactionPort() {
        assertThat(portfolioLedgerService).isNotNull();
        assertThat(ReflectionTestUtils.getField(portfolioLedgerService, "transactionPort")).isSameAs(portfolioTransactionPort);
    }

    @Test
    void should_wireJournalTradeService_with_tradePortAndPriceRefreshService() {
        assertThat(journalTradeService).isNotNull();
        assertThat(ReflectionTestUtils.getField(journalTradeService, "tradePort")).isSameAs(journalTradePort);
        assertThat(ReflectionTestUtils.getField(journalTradeService, "priceRefreshService")).isSameAs(priceRefreshService);
    }

    @Test
    void should_wireAgentAnalysisUseCase_with_allSixPorts() {
        assertThat(agentAnalysisUseCase).isNotNull();
        assertThat(ReflectionTestUtils.getField(agentAnalysisUseCase, "statementClient")).isSameAs(yahooStatementClientAdapter);
        assertThat(ReflectionTestUtils.getField(agentAnalysisUseCase, "financialDataPort")).isSameAs(financialDataPort);
        assertThat(ReflectionTestUtils.getField(agentAnalysisUseCase, "priceRepository")).isSameAs(priceRepositoryPort);
        assertThat(ReflectionTestUtils.getField(agentAnalysisUseCase, "sentimentDataPort")).isSameAs(sentimentDataPort);
        assertThat(ReflectionTestUtils.getField(agentAnalysisUseCase, "marketCalendarPort")).isSameAs(marketCalendarPort);
        assertThat(ReflectionTestUtils.getField(agentAnalysisUseCase, "agentAnalysisAiPort")).isSameAs(agentAnalysisAiPort);
    }

    @Test
    void should_wireSmartReportUseCase_with_twoPorts() {
        assertThat(smartReportUseCase).isNotNull();
        assertThat(ReflectionTestUtils.getField(smartReportUseCase, "smartReportScorePort")).isSameAs(smartReportScorePort);
        assertThat(ReflectionTestUtils.getField(smartReportUseCase, "smartReportMarketDataPort"))
                .isSameAs(smartReportMarketDataPort);
    }

    @Test
    void should_injectSameBeanOnMultipleCalls() {
        PriceIngestionService first = applicationContext.getBean(PriceIngestionService.class);
        PriceIngestionService second = applicationContext.getBean(PriceIngestionService.class);

        assertThat(first).isSameAs(second);
    }

    @SpringBootConfiguration
    @Import(DomainConfig.class)
    static class TestApplication {

        @Bean
        AssetRepositoryPort assetRepositoryPort() {
            // Mock rationale: infrastructure persistence port should not hit real DB in wiring test.
            return mock(AssetRepositoryPort.class);
        }

        @Bean
        PriceRepositoryPort priceRepositoryPort() {
            // Mock rationale: infrastructure persistence port should not hit real DB in wiring test.
            return mock(PriceRepositoryPort.class);
        }

        @Bean
        PriceChartClientPort priceChartClientPort() {
            // Mock rationale: external market provider I/O boundary is mocked in wiring test.
            return mock(PriceChartClientPort.class);
        }

        @Bean
        SymbolMappingPort symbolMappingPort() {
            // Mock rationale: symbol mapping persistence port should not hit real DB in wiring test.
            return mock(SymbolMappingPort.class);
        }

        @Bean
        FinancialDataPort financialDataPort() {
            // Mock rationale: external market provider I/O boundary is mocked in wiring test.
            return mock(FinancialDataPort.class);
        }

        @Bean
        WatchlistPort watchlistPort() {
            // Mock rationale: watchlist persistence port should not hit real DB in wiring test.
            return mock(WatchlistPort.class);
        }

        @Bean
        TechnicalAnalysisPort technicalAnalysisPort() {
            // Mock rationale: external technical-analysis provider is an I/O boundary.
            return mock(TechnicalAnalysisPort.class);
        }

        @Bean
        ResearchDataPort researchDataPort() {
            // Mock rationale: external fundamentals/research provider is an I/O boundary.
            return mock(ResearchDataPort.class);
        }
        @Bean
        PortfolioTransactionPort portfolioTransactionPort() {
            // Mock rationale: persistence boundary is mocked to keep context test deterministic.
            return mock(PortfolioTransactionPort.class);
        }

        @Bean
        JournalTradePort journalTradePort() {
            // Mock rationale: persistence boundary is mocked to keep context test deterministic.
            return mock(JournalTradePort.class);
        }

        @Bean
        YahooStatementClientAdapter yahooStatementClientAdapter() {
            // Mock rationale: external statement adapter is an I/O boundary.
            return mock(YahooStatementClientAdapter.class);
        }

        @Bean
        SentimentDataPort sentimentDataPort() {
            // Mock rationale: external sentiment provider is an I/O boundary.
            return mock(SentimentDataPort.class);
        }

        @Bean
        MarketCalendarPort marketCalendarPort() {
            // Mock rationale: external macro/calendar provider is an I/O boundary.
            return mock(MarketCalendarPort.class);
        }

        @Bean
        AgentAnalysisAiPort agentAnalysisAiPort() {
            // Mock rationale: AI inference gateway is external I/O.
            return mock(AgentAnalysisAiPort.class);
        }

        @Bean
        SmartReportScorePort smartReportScorePort() {
            // Mock rationale: external score provider is an I/O boundary.
            return mock(SmartReportScorePort.class);
        }

        @Bean
        SmartReportMarketDataPort smartReportMarketDataPort() {
            // Mock rationale: external market-data provider is an I/O boundary.
            return mock(SmartReportMarketDataPort.class);
        }
    }
}
