package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import com.ozkaslibasar.financeproject.domain.model.AgentMetricSnapshot;
import com.ozkaslibasar.financeproject.domain.model.AgentSentimentSnapshot;
import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.AgentAnalysisAiPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialStatementClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.MarketCalendarPort;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AgentAnalysisUseCase}.
 * All outbound ports are mocked.
 */
@ExtendWith(MockitoExtension.class)
class AgentAnalysisUseCaseTest {

    @Mock
    private FinancialStatementClientPort statementClient;

    @Mock
    private FinancialDataPort financialDataPort;

    @Mock
    private PriceRepositoryPort priceRepository;

    @Mock
    private SentimentDataPort sentimentDataPort;

    @Mock
    private MarketCalendarPort marketCalendarPort;

    @Mock
    private AgentAnalysisAiPort agentAnalysisAiPort;

    @InjectMocks
    private AgentAnalysisUseCase agentAnalysisUseCase;

    @BeforeEach
    void defaultMacroContextUnavailable() {
        when(marketCalendarPort.fetchMacroSnapshot()).thenReturn(Optional.empty());
    }

    // ─── buildMetricsSnapshot() ──────────────────────────────────────────────

    @Test
    void should_buildMetricsSnapshotSuccessfully_when_happyPath() {
        // Arrange
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
                symbol, 2024, "annual",
                BigDecimal.valueOf(1000), BigDecimal.valueOf(100),
                BigDecimal.valueOf(500), BigDecimal.valueOf(200),
                BigDecimal.valueOf(120), BigDecimal.valueOf(400),
                BigDecimal.valueOf(200)
        );

        FinancialStatement balance = new FinancialStatement(
                symbol, 2024, "annual",
                BigDecimal.valueOf(1000), BigDecimal.valueOf(100),
                BigDecimal.valueOf(500), BigDecimal.valueOf(200),
                BigDecimal.valueOf(120), BigDecimal.valueOf(400),
                BigDecimal.valueOf(200)
        );

        List<PriceHistory> prices = build30SamplePrices(symbol);

        when(priceRepository.findLatestByAssetId(symbol)).thenReturn(Optional.of(latestPriceHistory));
        when(statementClient.fetchIncomeStatements(symbol)).thenReturn(List.of(income));
        when(statementClient.fetchBalanceSheets(symbol)).thenReturn(List.of(balance));
        when(financialDataPort.fetchPriceHistory(symbol, "1d", "1y")).thenReturn(prices);

        // Act
        AgentMetricSnapshot snapshot = agentAnalysisUseCase.buildMetricsSnapshot(symbol);

        // Assert
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
        verifyNoMoreInteractions(priceRepository, statementClient, financialDataPort);
    }

    @Test
    void should_buildMetricsSnapshotWithFallbacks_when_emptyPath() {
        // Arrange
        String symbol = "AAPL";

        when(priceRepository.findLatestByAssetId(symbol)).thenReturn(Optional.empty());
        when(statementClient.fetchIncomeStatements(symbol)).thenReturn(Collections.emptyList());
        when(statementClient.fetchBalanceSheets(symbol)).thenReturn(Collections.emptyList());
        when(financialDataPort.fetchPriceHistory(symbol, "1d", "1y")).thenReturn(Collections.emptyList());

        List<PriceHistory> fallbackPrices = build30SamplePrices(symbol);
        when(priceRepository.findByAssetIdAndPeriod(eq(symbol), any(Instant.class), any(Instant.class)))
                .thenReturn(fallbackPrices);

        // Act
        AgentMetricSnapshot snapshot = agentAnalysisUseCase.buildMetricsSnapshot(symbol);

        // Assert
        assertThat(snapshot).isNotNull();
        assertThat(snapshot.price()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(snapshot.fundamentals()).isEmpty(); // merger / metrics calc returns empty on zero statements
        assertThat(snapshot.technical()).isNotEmpty(); // computed from fallbackPrices
        assertThat(snapshot.risk()).isNotEmpty();      // computed from fallbackPrices

        verify(priceRepository).findLatestByAssetId(symbol);
        verify(statementClient).fetchIncomeStatements(symbol);
        verify(statementClient).fetchBalanceSheets(symbol);
        verify(financialDataPort).fetchPriceHistory(symbol, "1d", "1y");
        verify(priceRepository).findByAssetIdAndPeriod(eq(symbol), any(Instant.class), any(Instant.class));
    }

    // ─── analyze() ───────────────────────────────────────────────────────────

    @Test
    void should_analyzeSuccessfully_when_happyPath() {
        // Arrange
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

        AgentSentimentSnapshot mockSentiment = new AgentSentimentSnapshot(
                0.8, "bullish", 0.7, "buy", 85
        );
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

        // Act
        Optional<AgentAnalysisResult> resultOpt = agentAnalysisUseCase.analyze(symbol);

        // Assert
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
    void should_returnEmptyOptional_when_aiAnalysisFails() {
        // Arrange
        String symbol = "AAPL";

        // Setup buildMetricsSnapshot mocks
        when(priceRepository.findLatestByAssetId(symbol)).thenReturn(Optional.empty());
        when(statementClient.fetchIncomeStatements(symbol)).thenReturn(Collections.emptyList());
        when(statementClient.fetchBalanceSheets(symbol)).thenReturn(Collections.emptyList());
        when(financialDataPort.fetchPriceHistory(symbol, "1d", "1y")).thenReturn(Collections.emptyList());
        when(priceRepository.findByAssetIdAndPeriod(eq(symbol), any(Instant.class), any(Instant.class)))
                .thenReturn(Collections.emptyList());

        // Sentiment unavailable: do not fabricate neutral/hold context.
        when(sentimentDataPort.fetchSentiment(symbol)).thenReturn(Optional.empty());

        // AI analysis returns empty
        when(agentAnalysisAiPort.runAnalysis(eq(symbol), any(AgentMetricSnapshot.class), isNull()))
                .thenReturn(Optional.empty());

        // Act
        Optional<AgentAnalysisResult> resultOpt = agentAnalysisUseCase.analyze(symbol);

        // Assert
        assertThat(resultOpt).isEmpty();

        verify(sentimentDataPort).fetchSentiment(symbol);
        verify(agentAnalysisAiPort).runAnalysis(eq(symbol), any(AgentMetricSnapshot.class), isNull());
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

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
