package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.FinnhubClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubInsiderTransactionsDto;
import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportMarketDataPort;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Tag(name = "Fundamentals", description = "Fundamentals, ratios, earnings, insider, and institutional data")
@RestController
@RequestMapping("/api/v1/fundamentals")
@RequiredArgsConstructor
public class FundamentalsController {

    private final FinancialDataPort financialDataPort;
    private final SmartReportMarketDataPort marketDataPort;
    private final ResearchDataPort researchDataPort;
    private final FinnhubClient finnhubClient;

    @Operation(summary = "GET Fundamentals endpoint", description = "Implements the GET operation for the Fundamentals API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping("/{symbol}")
    @Cacheable(value = "fundamentalCache", key = "'summary:' + #symbol.toUpperCase()")
    public FundamentalsData getFundamentals(@PathVariable String symbol) {
        String normalized = symbol.toUpperCase();
        List<FinancialStatement> statements = statements(normalized);
        ResearchDataPort.FundamentalMetrics metrics = researchDataPort.fetchFundamental(normalized)
                .map(ResearchDataPort.FundamentalResearch::metrics)
                .orElse(null);
        List<AnnualMetric> eps = researchDataPort.fetchEarnings(normalized).stream()
                .map(q -> annualMetricFromQuarter(q.period(), q.actual()))
                .filter(Objects::nonNull)
                .toList();
        return new FundamentalsData(
                normalized,
                annual(statements, Metric.REVENUE),
                annual(statements, Metric.NET_INCOME),
                eps,
                annual(statements, Metric.OPERATING_CASH_FLOW),
                metrics == null ? null : metrics.grossMargin(),
                metrics == null ? null : metrics.netMargin(),
                metrics == null ? null : metrics.roic(),
                metrics == null ? null : metrics.roe());
    }

    @Operation(summary = "GET Fundamentals endpoint", description = "Implements the GET operation for the Fundamentals API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping("/{symbol}/ratios")
    @Cacheable(value = "fundamentalCache", key = "'ratios:' + #symbol.toUpperCase()")
    public FinancialRatios getRatios(@PathVariable String symbol) {
        String normalized = symbol.toUpperCase();
        SmartReportMarketDataPort.CompanyMetrics market = marketDataPort.fetchCompanyMetrics(normalized).orElse(null);
        ResearchDataPort.FundamentalMetrics research = researchDataPort.fetchFundamental(normalized)
                .map(ResearchDataPort.FundamentalResearch::metrics)
                .orElse(null);
        return new FinancialRatios(
                market == null ? null : market.peRatio(),
                market == null ? null : market.pbRatio(),
                null,
                null,
                market != null && market.debtToEquity() != null ? market.debtToEquity() : research == null ? null : research.debtToEquity(),
                research == null ? null : research.currentRatio(),
                research == null ? null : research.quickRatio(),
                market != null && market.roe() != null ? market.roe() : research == null ? null : research.roe(),
                research == null ? null : research.roa());
    }

    @Operation(summary = "GET Fundamentals endpoint", description = "Implements the GET operation for the Fundamentals API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping("/{symbol}/earnings")
    @Cacheable(value = "fundamentalCache", key = "'earnings:' + #symbol.toUpperCase() + ':' + #periods")
    public List<EarningsResult> getEarnings(@PathVariable String symbol, @RequestParam(defaultValue = "8") int periods) {
        return researchDataPort.fetchEarnings(symbol.toUpperCase()).stream()
                .limit(Math.max(1, periods))
                .map(q -> new EarningsResult(q.period(), q.estimate(), q.actual(), q.surprise(), null, null, q.surprisePct()))
                .toList();
    }

    @Operation(summary = "GET Fundamentals endpoint", description = "Implements the GET operation for the Fundamentals API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping("/{symbol}/insider")
    @Cacheable(value = "insiderCache", key = "#symbol.toUpperCase()")
    public List<InsiderActivity> getInsiderActivity(@PathVariable String symbol) {
        return finnhubClient.getInsiderTransactions(symbol.toUpperCase()).stream()
                .limit(20)
                .map(this::toInsiderActivity)
                .toList();
    }

    @Operation(summary = "GET Fundamentals endpoint", description = "Implements the GET operation for the Fundamentals API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping("/{symbol}/institutional")
    @Cacheable(value = "fundamentalCache", key = "'institutional:' + #symbol.toUpperCase()")
    public List<InstitutionalHolder> getInstitutionalOwnership(@PathVariable String symbol) {
        return researchDataPort.fetchInstitutionalScores(symbol.toUpperCase())
                .map(scores -> List.of(
                        new InstitutionalHolder(
                                "Piotroski F-Score",
                                asBigDecimal(scores.piotroskiFScore()),
                                scorePercent(scores.piotroskiFScore(), 9),
                                null,
                                null,
                                null),
                        new InstitutionalHolder(
                                "Quality Composite",
                                asBigDecimal(scores.qualityComposite()),
                                scorePercent(scores.qualityComposite(), 100),
                                null,
                                null,
                                scores.economicMoat()),
                        new InstitutionalHolder(
                                "Earnings Quality",
                                asBigDecimal(scores.earningsQuality()),
                                scorePercent(scores.earningsQuality(), 100),
                                scores.altmanZScore() == null ? null : BigDecimal.valueOf(scores.altmanZScore()),
                                scores.beneishMScore() == null ? null : BigDecimal.valueOf(scores.beneishMScore()),
                                null)))
                .orElse(List.of());
    }

    private List<FinancialStatement> statements(String symbol) {
        try {
            return financialDataPort.fetchStatements(symbol);
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<AnnualMetric> annual(List<FinancialStatement> statements, Metric metric) {
        return statements.stream()
                .sorted(Comparator.comparing(FinancialStatement::fiscalYear))
                .map(statement -> new AnnualMetric(statement.fiscalYear(), value(statement, metric)))
                .toList();
    }

    private AnnualMetric annualMetricFromQuarter(String period, Double value) {
        if (period == null || value == null) {
            return null;
        }
        String digits = period.replaceAll("[^0-9]", "");
        if (digits.length() < 4) {
            return null;
        }
        return new AnnualMetric(Integer.parseInt(digits.substring(0, 4)), BigDecimal.valueOf(value));
    }

    private BigDecimal value(FinancialStatement statement, Metric metric) {
        return switch (metric) {
            case REVENUE -> statement.revenue();
            case NET_INCOME -> statement.netIncome();
            case OPERATING_CASH_FLOW -> statement.operatingCashFlow();
        };
    }

    private InsiderActivity toInsiderActivity(FinnhubInsiderTransactionsDto.Transaction transaction) {
        BigDecimal shares = transaction.getChange() == null ? transaction.getShare() : transaction.getChange().abs();
        BigDecimal price = transaction.getTransactionPrice() == null ? BigDecimal.ZERO : transaction.getTransactionPrice();
        BigDecimal value = shares == null ? BigDecimal.ZERO : shares.multiply(price);
        String type = transaction.getChange() != null && transaction.getChange().compareTo(BigDecimal.ZERO) < 0 ? "SELL" : "BUY";
        return new InsiderActivity(
                transaction.getName(),
                null,
                type,
                shares == null ? BigDecimal.ZERO : shares,
                price,
                value,
                transaction.getTransactionDate(),
                transaction.getFilingDate());
    }

    private BigDecimal asBigDecimal(Number value) {
        return value == null ? BigDecimal.ZERO : BigDecimal.valueOf(value.doubleValue());
    }

    private BigDecimal scorePercent(Number value, int max) {
        return value == null ? BigDecimal.ZERO : BigDecimal.valueOf(value.doubleValue() * 100.0 / max);
    }

    private enum Metric { REVENUE, NET_INCOME, OPERATING_CASH_FLOW }

    public record AnnualMetric(Integer year, BigDecimal value) {
    }

    public record FundamentalsData(
            String symbol,
            List<AnnualMetric> revenue,
            List<AnnualMetric> netIncome,
            List<AnnualMetric> eps,
            List<AnnualMetric> freeCashFlow,
            Double grossMargin,
            Double netMargin,
            Double roic,
            Double roe) {
    }

    public record FinancialRatios(
            Double pe,
            Double pb,
            Double ps,
            Double evEbitda,
            Double debtEquity,
            Double currentRatio,
            Double quickRatio,
            Double roe,
            Double roa) {
    }

    public record EarningsResult(
            String quarter,
            Double epsEstimate,
            Double epsActual,
            Double surprise,
            Double revenueEstimate,
            Double revenueActual,
            Double surprisePct) {
    }

    public record InsiderActivity(
            String name,
            String title,
            String transactionType,
            BigDecimal shares,
            BigDecimal price,
            BigDecimal value,
            String date,
            String filingDate) {
    }

    public record InstitutionalHolder(
            String institution,
            BigDecimal shares,
            BigDecimal percentHeld,
            BigDecimal changeShares,
            BigDecimal changePercent,
            String reportDate) {
    }
}
