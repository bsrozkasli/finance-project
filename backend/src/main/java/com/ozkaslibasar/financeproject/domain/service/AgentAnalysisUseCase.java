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

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Aggregates market data, computes metrics in-domain, and delegates reasoning to the AI port.
 */
public class AgentAnalysisUseCase {

    private final FinancialStatementClientPort statementClient;
    private final FinancialDataPort financialDataPort;
    private final PriceRepositoryPort priceRepository;
    private final SentimentDataPort sentimentDataPort;
    private final MarketCalendarPort marketCalendarPort;
    private final AgentAnalysisAiPort agentAnalysisAiPort;

    public AgentAnalysisUseCase(
            FinancialStatementClientPort statementClient,
            FinancialDataPort financialDataPort,
            PriceRepositoryPort priceRepository,
            SentimentDataPort sentimentDataPort,
            MarketCalendarPort marketCalendarPort,
            AgentAnalysisAiPort agentAnalysisAiPort) {
        this.statementClient = statementClient;
        this.financialDataPort = financialDataPort;
        this.priceRepository = priceRepository;
        this.sentimentDataPort = sentimentDataPort;
        this.marketCalendarPort = marketCalendarPort;
        this.agentAnalysisAiPort = agentAnalysisAiPort;
    }

    public AgentMetricSnapshot buildMetricsSnapshot(String ticker) {
        String symbol = ticker.toUpperCase();

        BigDecimal price = priceRepository.findLatestByAssetId(symbol)
                .map(PriceHistory::close)
                .orElse(BigDecimal.ZERO);

        List<FinancialStatement> income = statementClient.fetchIncomeStatements(symbol);
        List<FinancialStatement> balance = statementClient.fetchBalanceSheets(symbol);
        List<FinancialStatement> merged = FinancialStatementMerger.merge(income, balance);

        List<PriceHistory> prices = financialDataPort.fetchPriceHistory(symbol, "1d", "1y");
        if (prices.isEmpty()) {
            prices = priceRepository.findByAssetIdAndPeriod(
                    symbol,
                    java.time.Instant.now().minus(java.time.Duration.ofDays(365)),
                    java.time.Instant.now()
            );
        }

        Map<String, BigDecimal> fundamentals = FinancialMetricsCalculator.compute(merged, price);
        Map<String, BigDecimal> technical = TechnicalMetricsCalculator.compute(prices);
        Map<String, BigDecimal> risk = RiskMetricsCalculator.compute(prices);

        Map<String, BigDecimal> valuation = new LinkedHashMap<>();
        valuation.put("dcf_fair_value", fundamentals.getOrDefault("dcf_fair_value", BigDecimal.ZERO));
        valuation.put("intrinsic_value", fundamentals.getOrDefault("intrinsic_value", BigDecimal.ZERO));

        Map<String, BigDecimal> macroContext = marketCalendarPort.fetchMacroSnapshot()
                .map(this::macroAsMap)
                .orElseGet(this::emptyMacroMap);

        return new AgentMetricSnapshot(price, fundamentals, valuation, risk, technical, macroContext);
    }

    public Optional<AgentAnalysisResult> analyze(String ticker) {
        String symbol = ticker.toUpperCase();
        AgentMetricSnapshot metrics = buildMetricsSnapshot(symbol);

        AgentSentimentSnapshot sentiment = sentimentDataPort.fetchSentiment(symbol).orElse(null);

        return agentAnalysisAiPort.runAnalysis(symbol, metrics, sentiment)
                .map(result -> enrichWithMetrics(result, metrics));
    }

    public Map<String, Object> metricsAsMap(AgentMetricSnapshot snapshot) {
        Map<String, Object> map = new HashMap<>();
        map.put("price", snapshot.price());
        map.put("fundamentals", toPlainMap(snapshot.fundamentals()));
        map.put("valuation", toPlainMap(snapshot.valuation()));
        map.put("risk", toPlainMap(snapshot.risk()));
        map.put("technical", toPlainMap(snapshot.technical()));
        map.put("macro_context", toPlainMap(snapshot.macroContext()));
        return map;
    }

    private AgentAnalysisResult enrichWithMetrics(AgentAnalysisResult result, AgentMetricSnapshot metrics) {
        return new AgentAnalysisResult(
                result.ticker(),
                result.decision(),
                result.confidence(),
                result.fundamentalSummary(),
                result.technicalSummary(),
                result.riskSummary(),
                result.bullCase(),
                result.bearCase(),
                result.portfolioManagerReasoning(),
                metricsAsMap(metrics),
                result.generatedAt(),
                result.fromCache()
        );
    }

    private Map<String, BigDecimal> macroAsMap(MacroSnapshot snapshot) {
        Map<String, BigDecimal> map = new LinkedHashMap<>();
        map.put("fed_funds_rate", snapshot.fedFundsRate());
        map.put("cpi_yoy", snapshot.cpiYoy());
        map.put("gdp_growth", snapshot.gdpGrowth());
        map.put("unemployment_rate", snapshot.unemploymentRate());
        map.put("treasury_10y", snapshot.treasury10y());
        map.put("treasury_2y", snapshot.treasury2y());
        map.put("yield_curve_spread", snapshot.yieldCurveSpread());
        return map;
    }

    private Map<String, BigDecimal> emptyMacroMap() {
        Map<String, BigDecimal> map = new LinkedHashMap<>();
        map.put("fed_funds_rate", null);
        map.put("cpi_yoy", null);
        map.put("gdp_growth", null);
        map.put("unemployment_rate", null);
        map.put("treasury_10y", null);
        map.put("treasury_2y", null);
        map.put("yield_curve_spread", null);
        return map;
    }

    private Map<String, Object> toPlainMap(Map<String, BigDecimal> source) {
        Map<String, Object> out = new LinkedHashMap<>();
        source.forEach((k, v) -> out.put(k, v));
        return out;
    }
}