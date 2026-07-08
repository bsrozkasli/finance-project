package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import com.ozkaslibasar.financeproject.domain.model.AgentMetricSnapshot;
import com.ozkaslibasar.financeproject.domain.model.AgentSentimentSnapshot;
import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import com.ozkaslibasar.financeproject.domain.model.MacroSnapshot;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.AgentAnalysisAiPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialStatementClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.MarketCalendarPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SentimentDataPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
/** EXPECTED_SOURCE_DEFAULT: derived_from_spec */
class AgentAnalysisUseCaseTest {

    @Mock
    // Mock rationale: outbound I/O port, isolates external statement provider.
    private FinancialStatementClientPort statementClient;

    @Mock
    // Mock rationale: outbound I/O port, avoids network/data-service dependency.
    private FinancialDataPort financialDataPort;

    @Mock
    // Mock rationale: outbound persistence port, avoids DB dependency.
    private PriceRepositoryPort priceRepository;

    @Mock
    // Mock rationale: outbound I/O port, sentiment provider is external.
    private SentimentDataPort sentimentDataPort;

    @Mock
    // Mock rationale: outbound I/O port, macro calendar provider is external.
    private MarketCalendarPort marketCalendarPort;

    @Mock
    // Mock rationale: outbound AI gateway port, isolates LLM call boundary.
    private AgentAnalysisAiPort agentAnalysisAiPort;

    @InjectMocks
    private AgentAnalysisUseCase agentAnalysisUseCase;

    @BeforeEach
    void defaultMacroContextUnavailable() {
        when(marketCalendarPort.fetchMacroSnapshot()).thenReturn(Optional.empty());
    }

    @Test
    void should_buildMetricsSnapshotSuccessfully_when_happyPath() {
        String symbol = "AAPL";
        BigDecimal latestPrice = BigDecimal.valueOf(150.00);

        PriceHistory latestPriceHistory = new PriceHistory(
                symbol,
                latestPrice,
                latestPrice,
                latestPrice,
                latestPrice,
                BigDecimal.valueOf(1000),
                Instant.now()
        );

        FinancialStatement income = new FinancialStatement(
                symbol,
                2024,
                "annual",
                BigDecimal.valueOf(1000),
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(500),
                BigDecimal.valueOf(200),
                BigDecimal.valueOf(120),
                BigDecimal.valueOf(400),
                BigDecimal.valueOf(200)
        );

        FinancialStatement balance = new FinancialStatement(
                symbol,
                2024,
                "annual",
                BigDecimal.valueOf(1000),
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(500),
                BigDecimal.valueOf(200),
                BigDecimal.valueOf(120),
                BigDecimal.valueOf(400),
                BigDecimal.valueOf(200)
        );

        List<PriceHistory> prices = build30SamplePrices(symbol);

        when(priceRepository.findLatestByAssetId(symbol)).thenReturn(Optional.of(latestPriceHistory));
        when(statementClient.fetchIncomeStatements(symbol)).thenReturn(List.of(income));
        when(statementClient.fetchBalanceSheets(symbol)).thenReturn(List.of(balance));
        when(financialDataPort.fetchPriceHistory(symbol, "1d", "1y")).thenReturn(prices);

        AgentMetricSnapshot snapshot = agentAnalysisUseCase.buildMetricsSnapshot(symbol);

        assertThat(snapshot).isNotNull();
        assertThat(snapshot.price()).isEqualByComparingTo(latestPrice);
        assertThat(snapshot.fundamentals()).isNotEmpty();
        assertThat(snapshot.technical()).isNotEmpty();
        assertThat(snapshot.risk()).isNotEmpty();
        assertThat(snapshot.valuation()).isNotEmpty();
        assertThat(snapshot.macroContext()).containsEntry("fed_funds_rate", null);

        verify(priceRepository).findLatestByAssetId(symbol);
        verify(statementClient).fetchIncomeStatements(symbol);
        verify(statementClient).fetchBalanceSheets(symbol);
        verify(financialDataPort).fetchPriceHistory(symbol, "1d", "1y");
    }

    @Test
    void should_buildMetricsSnapshotWithFallbacks_when_emptyPath() {
        String symbol = "AAPL";

        when(priceRepository.findLatestByAssetId(symbol)).thenReturn(Optional.empty());
        when(statementClient.fetchIncomeStatements(symbol)).thenReturn(Collections.emptyList());
        when(statementClient.fetchBalanceSheets(symbol)).thenReturn(Collections.emptyList());
        when(financialDataPort.fetchPriceHistory(symbol, "1d", "1y")).thenReturn(Collections.emptyList());

        List<PriceHistory> fallbackPrices = build30SamplePrices(symbol);
        when(priceRepository.findByAssetIdAndPeriod(eq(symbol), any(Instant.class), any(Instant.class)))
                .thenReturn(fallbackPrices);

        AgentMetricSnapshot snapshot = agentAnalysisUseCase.buildMetricsSnapshot(symbol);

        assertThat(snapshot).isNotNull();
        assertThat(snapshot.price()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(snapshot.fundamentals()).isEmpty();
        assertThat(snapshot.technical()).isNotEmpty();
        assertThat(snapshot.risk()).isNotEmpty();

        verify(priceRepository).findLatestByAssetId(symbol);
        verify(statementClient).fetchIncomeStatements(symbol);
        verify(statementClient).fetchBalanceSheets(symbol);
        verify(financialDataPort).fetchPriceHistory(symbol, "1d", "1y");
        verify(priceRepository).findByAssetIdAndPeriod(eq(symbol), any(Instant.class), any(Instant.class));
    }

    @Test
    void should_lowercaseTickerThenUppercase_in_buildMetricsSnapshot() {
        when(priceRepository.findLatestByAssetId("AAPL")).thenReturn(Optional.empty());
        when(statementClient.fetchIncomeStatements("AAPL")).thenReturn(Collections.emptyList());
        when(statementClient.fetchBalanceSheets("AAPL")).thenReturn(Collections.emptyList());
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "1y")).thenReturn(build30SamplePrices("AAPL"));

        agentAnalysisUseCase.buildMetricsSnapshot("aapl");

        verify(priceRepository).findLatestByAssetId("AAPL");
        verify(statementClient).fetchIncomeStatements("AAPL");
        verify(statementClient).fetchBalanceSheets("AAPL");
        verify(financialDataPort).fetchPriceHistory("AAPL", "1d", "1y");
    }

    @Test
    void should_includeAllMacroFields_in_macroContext_when_available() {
        // # EXPECTED_SOURCE: mirrors_implementation (RISKLI)
        String symbol = "AAPL";
        MacroSnapshot macroSnapshot = new MacroSnapshot(
                BigDecimal.valueOf(5.25),
                BigDecimal.valueOf(300),
                BigDecimal.valueOf(3.10),
                BigDecimal.valueOf(2.20),
                BigDecimal.valueOf(3.90),
                BigDecimal.valueOf(4.30),
                BigDecimal.valueOf(4.00),
                BigDecimal.valueOf(0.30),
                "2026-01-01",
                Instant.parse("2026-01-01T00:00:00Z")
        );

        when(marketCalendarPort.fetchMacroSnapshot()).thenReturn(Optional.of(macroSnapshot));
        when(priceRepository.findLatestByAssetId(symbol)).thenReturn(Optional.empty());
        when(statementClient.fetchIncomeStatements(symbol)).thenReturn(Collections.emptyList());
        when(statementClient.fetchBalanceSheets(symbol)).thenReturn(Collections.emptyList());
        when(financialDataPort.fetchPriceHistory(symbol, "1d", "1y")).thenReturn(build30SamplePrices(symbol));

        AgentMetricSnapshot snapshot = agentAnalysisUseCase.buildMetricsSnapshot(symbol);

        assertThat(snapshot.macroContext()).containsEntry("fed_funds_rate", BigDecimal.valueOf(5.25));
        assertThat(snapshot.macroContext()).containsEntry("cpi_yoy", BigDecimal.valueOf(3.10));
        assertThat(snapshot.macroContext()).containsEntry("gdp_growth", BigDecimal.valueOf(2.20));
        assertThat(snapshot.macroContext()).containsEntry("unemployment_rate", BigDecimal.valueOf(3.90));
        assertThat(snapshot.macroContext()).containsEntry("treasury_10y", BigDecimal.valueOf(4.30));
        assertThat(snapshot.macroContext()).containsEntry("treasury_2y", BigDecimal.valueOf(4.00));
        assertThat(snapshot.macroContext()).containsEntry("yield_curve_spread", BigDecimal.valueOf(0.30));
    }

    @Test
    void should_analyzeSuccessfully_when_happyPath() {
        String symbol = "AAPL";
        BigDecimal latestPrice = BigDecimal.valueOf(150.00);

        PriceHistory latestPriceHistory = new PriceHistory(
                symbol,
                latestPrice,
                latestPrice,
                latestPrice,
                latestPrice,
                BigDecimal.valueOf(1000),
                Instant.now()
        );

        List<PriceHistory> prices = build30SamplePrices(symbol);

        when(priceRepository.findLatestByAssetId(symbol)).thenReturn(Optional.of(latestPriceHistory));
        when(statementClient.fetchIncomeStatements(symbol)).thenReturn(Collections.emptyList());
        when(statementClient.fetchBalanceSheets(symbol)).thenReturn(Collections.emptyList());
        when(financialDataPort.fetchPriceHistory(symbol, "1d", "1y")).thenReturn(prices);

        AgentSentimentSnapshot mockSentiment = new AgentSentimentSnapshot(0.8, "bullish", 0.7, "buy", 85);
        when(sentimentDataPort.fetchSentiment(symbol)).thenReturn(Optional.of(mockSentiment));

        AgentAnalysisResult mockResult = new AgentAnalysisResult(
                symbol,
                "BUY",
                90,
                "Strong growth",
                "Bullish crossover",
                "Low beta",
                "Product expansion",
                "Supply chain issues",
                "Solid choice",
                Collections.emptyMap(),
                Instant.now(),
                false
        );

        when(agentAnalysisAiPort.runAnalysis(eq(symbol), any(AgentMetricSnapshot.class), eq(mockSentiment)))
                .thenReturn(Optional.of(mockResult));

        Optional<AgentAnalysisResult> resultOpt = agentAnalysisUseCase.analyze(symbol);

        assertThat(resultOpt).isPresent();
        AgentAnalysisResult finalResult = resultOpt.get();
        assertThat(finalResult.ticker()).isEqualTo(symbol);
        assertThat(finalResult.decision()).isEqualTo("BUY");
        assertThat(finalResult.confidence()).isEqualTo(90);
        assertThat(finalResult.metricsUsed()).containsKey("price");

        verify(sentimentDataPort).fetchSentiment(symbol);
        verify(agentAnalysisAiPort).runAnalysis(eq(symbol), any(AgentMetricSnapshot.class), eq(mockSentiment));
    }

    @Test
    void should_enrichAnalysisResultWithMetrics_when_aiReturnsResult() {
        // # EXPECTED_SOURCE: mirrors_implementation (RISKLI)
        String symbol = "AAPL";

        when(priceRepository.findLatestByAssetId(symbol)).thenReturn(Optional.empty());
        when(statementClient.fetchIncomeStatements(symbol)).thenReturn(Collections.emptyList());
        when(statementClient.fetchBalanceSheets(symbol)).thenReturn(Collections.emptyList());
        when(financialDataPort.fetchPriceHistory(symbol, "1d", "1y")).thenReturn(build30SamplePrices(symbol));
        when(sentimentDataPort.fetchSentiment(symbol)).thenReturn(Optional.empty());

        AgentAnalysisResult aiRawResult = new AgentAnalysisResult(
                symbol,
                "HOLD",
                60,
                "neutral fundamentals",
                "sideways",
                "moderate risk",
                "stable cash flow",
                "valuation premium",
                "wait and see",
                Collections.emptyMap(),
                Instant.now(),
                false
        );

        when(agentAnalysisAiPort.runAnalysis(eq(symbol), any(AgentMetricSnapshot.class), isNull()))
                .thenReturn(Optional.of(aiRawResult));

        Optional<AgentAnalysisResult> result = agentAnalysisUseCase.analyze(symbol);

        assertThat(result).isPresent();
        assertThat(result.get().metricsUsed()).containsKeys(
                "price", "fundamentals", "valuation", "risk", "technical", "macro_context"
        );
        assertThat(result.get().metricsUsed().get("price")).isEqualTo(BigDecimal.ZERO);
        assertThat(result.get().metricsUsed().get("fundamentals")).isInstanceOf(Map.class);
        assertThat(result.get().metricsUsed().get("macro_context")).isInstanceOf(Map.class);
    }

    @Test
    void should_handleSentimentAsNullInAnalysis_when_unavailable() {
        String symbol = "AAPL";

        when(priceRepository.findLatestByAssetId(symbol)).thenReturn(Optional.empty());
        when(statementClient.fetchIncomeStatements(symbol)).thenReturn(Collections.emptyList());
        when(statementClient.fetchBalanceSheets(symbol)).thenReturn(Collections.emptyList());
        when(financialDataPort.fetchPriceHistory(symbol, "1d", "1y")).thenReturn(build30SamplePrices(symbol));
        when(sentimentDataPort.fetchSentiment(symbol)).thenReturn(Optional.empty());

        AgentAnalysisResult aiRawResult = new AgentAnalysisResult(
                symbol,
                "HOLD",
                55,
                "fundamental summary",
                "technical summary",
                "risk summary",
                "bull case",
                "bear case",
                "portfolio reasoning",
                Collections.emptyMap(),
                Instant.now(),
                false
        );

        when(agentAnalysisAiPort.runAnalysis(eq(symbol), any(AgentMetricSnapshot.class), isNull()))
                .thenReturn(Optional.of(aiRawResult));

        Optional<AgentAnalysisResult> result = agentAnalysisUseCase.analyze(symbol);

        assertThat(result).isPresent();
        verify(sentimentDataPort).fetchSentiment(symbol);
        verify(agentAnalysisAiPort).runAnalysis(eq(symbol), any(AgentMetricSnapshot.class), isNull());
    }

    @Test
    void should_returnEmptyOptional_when_aiAnalysisFails() {
        String symbol = "AAPL";

        when(priceRepository.findLatestByAssetId(symbol)).thenReturn(Optional.empty());
        when(statementClient.fetchIncomeStatements(symbol)).thenReturn(Collections.emptyList());
        when(statementClient.fetchBalanceSheets(symbol)).thenReturn(Collections.emptyList());
        when(financialDataPort.fetchPriceHistory(symbol, "1d", "1y")).thenReturn(Collections.emptyList());
        when(priceRepository.findByAssetIdAndPeriod(eq(symbol), any(Instant.class), any(Instant.class)))
                .thenReturn(Collections.emptyList());
        when(sentimentDataPort.fetchSentiment(symbol)).thenReturn(Optional.empty());

        when(agentAnalysisAiPort.runAnalysis(eq(symbol), any(AgentMetricSnapshot.class), isNull()))
                .thenReturn(Optional.empty());

        Optional<AgentAnalysisResult> resultOpt = agentAnalysisUseCase.analyze(symbol);

        assertThat(resultOpt).isEmpty();

        verify(sentimentDataPort).fetchSentiment(symbol);
        verify(agentAnalysisAiPort).runAnalysis(eq(symbol), any(AgentMetricSnapshot.class), isNull());
    }

    private List<PriceHistory> build30SamplePrices(String symbol) {
        List<PriceHistory> prices = new ArrayList<>();
        Instant baseTime = Instant.parse("2026-01-01T16:00:00Z");
        for (int i = 0; i < 30; i++) {
            prices.add(new PriceHistory(
                    symbol,
                    BigDecimal.valueOf(150.00 + i),
                    BigDecimal.valueOf(155.00 + i),
                    BigDecimal.valueOf(157.50 + i),
                    BigDecimal.valueOf(149.00 + i),
                    BigDecimal.valueOf(1_000_000L),
                    baseTime.plus(java.time.Duration.ofDays(i))
            ));
        }
        return prices;
    }
}
