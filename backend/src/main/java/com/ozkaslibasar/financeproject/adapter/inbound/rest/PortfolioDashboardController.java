package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.model.PortfolioPosition;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPositionPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

@Tag(name = "Portfolio Dashboard", description = "Portfolio summary, performance, allocation, and enriched positions")
@RestController
@RequestMapping("/api/v1/portfolio")
@RequiredArgsConstructor
public class PortfolioDashboardController {

    private static final String DEFAULT_USER = "default";

    private final PortfolioPositionPort positionPort;
    private final PortfolioPort portfolioPort;
    private final PortfolioTransactionPort transactionPort;
    private final PortfolioLedgerService ledgerService;
    private final PriceRefreshService priceRefreshService;

    @Operation(summary = "GET Portfolio Dashboard endpoint", description = "Implements the GET operation for the Portfolio Dashboard API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/summary")
    public PortfolioSummary getSummary() {
        List<PortfolioPosition> positions = positionPort.findByUserId(DEFAULT_USER);
        BigDecimal totalValue = sum(positions.stream().map(this::marketValue).toList());
        BigDecimal costBasis = sum(positions.stream()
                .map(position -> position.quantity().multiply(position.avgCostPrice()))
                .toList());
        BigDecimal dailyPnl = sum(positions.stream().map(this::dailyPnl).toList());
        BigDecimal previousValue = totalValue.subtract(dailyPnl);
        BigDecimal totalPnl = totalValue.subtract(costBasis);
        return new PortfolioSummary(
                totalValue,
                BigDecimal.ZERO,
                dailyPnl,
                percent(dailyPnl, previousValue),
                totalPnl,
                percent(totalPnl, costBasis));
    }

    @Operation(summary = "GET Portfolio Dashboard endpoint", description = "Implements the GET operation for the Portfolio Dashboard API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/performance")
    public PortfolioPerformance getPerformance(
            @RequestParam(defaultValue = "1M") String period,
            @RequestParam(required = false) String benchmark) {
        List<PortfolioPosition> positions = positionPort.findByUserId(DEFAULT_USER);
        if (positions.isEmpty()) {
            return new PortfolioPerformance(period, List.of(), new PortfolioMetrics(null, null));
        }

        Instant to = Instant.now();
        Instant from = periodStart(period, to);
        Map<String, TreeMap<LocalDate, BigDecimal>> histories = new LinkedHashMap<>();
        for (PortfolioPosition position : positions) {
            List<PriceHistory> prices = priceRefreshService.getFreshHistory(position.symbol().toUpperCase(), "1d",
                    periodToRange(period));
            TreeMap<LocalDate, BigDecimal> byDate = new TreeMap<>();
            for (PriceHistory price : prices) {
                byDate.put(price.timestamp().toLocalDate(), price.close());
            }
            if (!byDate.isEmpty()) {
                histories.put(position.symbol().toUpperCase(), byDate);
            }
        }

        if (histories.isEmpty()) {
            return new PortfolioPerformance(period, List.of(), new PortfolioMetrics(null, null));
        }

        TreeMap<LocalDate, BigDecimal> benchmarkHistory = benchmarkHistory(benchmark, period);
        TreeMap<LocalDate, BigDecimal> seriesByDate = new TreeMap<>();
        for (TreeMap<LocalDate, BigDecimal> history : histories.values()) {
            history.keySet().forEach(date -> seriesByDate.putIfAbsent(date, BigDecimal.ZERO));
        }

        List<PortfolioPerformancePoint> series = new ArrayList<>();
        Map<String, BigDecimal> lastCloseBySymbol = new LinkedHashMap<>();
        for (LocalDate date : seriesByDate.keySet()) {
            BigDecimal value = BigDecimal.ZERO;
            boolean hasAnyValue = false;
            for (PortfolioPosition position : positions) {
                TreeMap<LocalDate, BigDecimal> history = histories.get(position.symbol().toUpperCase());
                if (history == null) {
                    continue;
                }
                BigDecimal close = history.get(date);
                if (close != null) {
                    lastCloseBySymbol.put(position.symbol().toUpperCase(), close);
                } else {
                    close = lastCloseBySymbol.get(position.symbol().toUpperCase());
                }
                if (close == null) {
                    continue;
                }
                hasAnyValue = true;
                value = value.add(position.quantity().multiply(close));
            }
            if (hasAnyValue) {
                series.add(new PortfolioPerformancePoint(date.toString(), value, null));
            }
        }

        if (!benchmarkHistory.isEmpty()) {
            series = withBenchmarkValues(series, benchmarkHistory);
        }

        return new PortfolioPerformance(period, series, new PortfolioMetrics(null, maxDrawdown(series)));
    }

    @Operation(
            summary = "Compare portfolio and benchmark cumulative returns",
            description = "Returns normalized cumulative-return series for one or more investment portfolios and optional benchmarks. Series are derived only from refreshed real price history; missing provider data returns empty points instead of fabricated values.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "404", description = "Requested portfolio was not found"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping("/performance/comparison")
    public PortfolioPerformanceComparison getPerformanceComparison(
            @Parameter(description = "Investment portfolio ids to include. When omitted, all user portfolios are included.")
            @RequestParam(required = false) List<Long> portfolioIds,
            @Parameter(description = "Benchmark ids to include. Supported aliases include SP500, NASDAQ, GOLD, ALTIN, and BIST100.")
            @RequestParam(required = false) List<String> benchmarks,
            @Parameter(description = "Comparison period: 1M, 3M, 6M, YTD, 1Y, or ALL.")
            @RequestParam(defaultValue = "6M") String period) {
        String normalizedPeriod = normalizeComparisonPeriod(period);
        List<Portfolio> selectedPortfolios = selectedPortfolios(portfolioIds);
        List<ComparisonSeries> series = new ArrayList<>();

        for (Portfolio portfolio : selectedPortfolios) {
            series.add(portfolioComparisonSeries(portfolio, normalizedPeriod));
        }

        for (String benchmark : normalizedBenchmarks(benchmarks)) {
            series.add(benchmarkComparisonSeries(benchmark, normalizedPeriod));
        }

        return new PortfolioPerformanceComparison(normalizedPeriod, series);
    }

    @Operation(
            summary = "Get active portfolio position performance metrics",
            description = "Returns position-level cost, current price, weight, added date, and realized time-window returns for the selected investment portfolio. Time-window returns are null when refreshed price history is unavailable or insufficient.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "404", description = "Requested portfolio was not found"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping("/positions/performance")
    public List<PortfolioPositionPerformance> getPositionPerformance(
            @Parameter(description = "Investment portfolio id. When omitted, the default portfolio is used, then the first user portfolio.")
            @RequestParam(required = false) Long portfolioId) {
        Portfolio portfolio = selectedPortfolio(portfolioId);
        if (portfolio == null) {
            return List.of();
        }

        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(portfolio.id(), DEFAULT_USER);
        if (holdings.isEmpty()) {
            return List.of();
        }

        Map<String, LocalDate> addedDates = earliestAddedDates(portfolio.id());
        Map<String, BigDecimal> currentPrices = new LinkedHashMap<>();
        Map<String, BigDecimal> marketValues = new LinkedHashMap<>();
        BigDecimal totalMarketValue = BigDecimal.ZERO;

        for (PortfolioHolding holding : holdings) {
            String symbol = holding.symbol().toUpperCase();
            BigDecimal currentPrice = currentPrice(symbol, holding.averageCost());
            BigDecimal marketValue = holding.quantity().multiply(currentPrice);
            currentPrices.put(symbol, currentPrice);
            marketValues.put(symbol, marketValue);
            totalMarketValue = totalMarketValue.add(marketValue);
        }

        List<PortfolioPositionPerformance> positions = new ArrayList<>();
        for (PortfolioHolding holding : holdings) {
            String symbol = holding.symbol().toUpperCase();
            BigDecimal currentPrice = currentPrices.get(symbol);
            BigDecimal marketValue = marketValues.get(symbol);
            List<PriceHistory> history = sortedHistory(symbol, "1y");
            LocalDate latestDate = latestPriceDate(history);

            positions.add(new PortfolioPositionPerformance(
                    symbol,
                    symbol,
                    dateString(addedDates.get(symbol)),
                    holding.averageCost(),
                    currentPrice,
                    marketValue,
                    percent(marketValue, totalMarketValue),
                    dailyReturn(history),
                    returnSince(history, currentPrice, latestDate, latestDate == null ? null : latestDate.minusDays(7)),
                    returnSince(history, currentPrice, latestDate, latestDate == null ? null : latestDate.minusMonths(1)),
                    returnSince(history, currentPrice, latestDate, latestDate == null ? null : latestDate.minusMonths(3)),
                    returnSince(history, currentPrice, latestDate, latestDate == null ? null : latestDate.minusMonths(6)),
                    returnSince(history, currentPrice, latestDate, latestDate == null ? null : latestDate.minusYears(1)),
                    percent(currentPrice.subtract(holding.averageCost()), holding.averageCost())));
        }

        positions.sort(Comparator.comparing(PortfolioPositionPerformance::weight).reversed());
        return positions;
    }

    @Operation(summary = "GET Portfolio Dashboard endpoint", description = "Implements the GET operation for the Portfolio Dashboard API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/allocation")
    public PortfolioAllocation getAllocation() {
        List<EnrichedPosition> positions = getEnrichedPositions();
        BigDecimal totalValue = sum(positions.stream().map(EnrichedPosition::marketValue).toList());
        List<AllocationSlice> byAsset = positions.stream()
                .map(position -> new AllocationSlice(
                        position.symbol(),
                        percent(position.marketValue(), totalValue),
                        position.marketValue(),
                        null))
                .toList();
        return new PortfolioAllocation(List.of(), byAsset, List.of());
    }

    @Operation(summary = "GET Portfolio Dashboard endpoint", description = "Implements the GET operation for the Portfolio Dashboard API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/positions/enriched")
    public List<EnrichedPosition> getEnrichedPositions() {
        List<PortfolioPosition> positions = positionPort.findByUserId(DEFAULT_USER);
        BigDecimal totalValue = sum(positions.stream().map(this::marketValue).toList());
        return positions.stream()
                .map(position -> toEnriched(position, totalValue))
                .toList();
    }

    private EnrichedPosition toEnriched(PortfolioPosition position, BigDecimal totalValue) {
        BigDecimal currentPrice = currentPrice(position);
        BigDecimal costBasis = position.quantity().multiply(position.avgCostPrice());
        BigDecimal marketValue = position.quantity().multiply(currentPrice);
        BigDecimal unrealizedPnl = marketValue.subtract(costBasis);
        return new EnrichedPosition(
                position.symbol(),
                position.symbol(),
                position.quantity(),
                position.avgCostPrice(),
                currentPrice,
                costBasis,
                marketValue,
                percent(marketValue, totalValue),
                BigDecimal.ZERO,
                percent(unrealizedPnl, costBasis),
                unrealizedPnl);
    }

    private TreeMap<LocalDate, BigDecimal> benchmarkHistory(String benchmark, String period) {
        String symbol = benchmarkSymbol(benchmark);
        TreeMap<LocalDate, BigDecimal> byDate = new TreeMap<>();
        if (symbol == null) {
            return byDate;
        }
        List<PriceHistory> prices = priceRefreshService.getFreshHistory(symbol, "1d", periodToRange(period));
        for (PriceHistory price : prices) {
            byDate.put(price.timestamp().toLocalDate(), price.close());
        }
        return byDate;
    }

    private String benchmarkSymbol(String benchmark) {
        if (benchmark == null || benchmark.isBlank()) {
            return null;
        }
        String normalized = benchmark.trim().toUpperCase();
        return switch (normalized) {
            case "SP500", "S&P500", "SNP500", "SPY" -> "SPY";
            case "NASDAQ", "NASDAQ100", "QQQ" -> "QQQ";
            case "BIST100", "XU100" -> "XU100.IS";
            case "GOLD", "ALTIN", "GLD" -> "GLD";
            default -> normalized;
        };
    }

    private String benchmarkLabel(String benchmark) {
        String normalized = benchmark.trim().toUpperCase();
        return switch (normalized) {
            case "SP500", "S&P500", "SNP500", "SPY" -> "S&P 500";
            case "NASDAQ", "NASDAQ100", "QQQ" -> "NASDAQ";
            case "BIST100", "XU100", "XU100.IS" -> "BIST 100";
            case "GOLD", "ALTIN", "GLD" -> "GOLD";
            default -> normalized;
        };
    }

    private List<Portfolio> selectedPortfolios(List<Long> portfolioIds) {
        List<Portfolio> portfolios = portfolioPort.findByUserId(DEFAULT_USER);
        if (portfolioIds == null || portfolioIds.isEmpty()) {
            return portfolios;
        }
        Map<Long, Portfolio> byId = new LinkedHashMap<>();
        for (Portfolio portfolio : portfolios) {
            byId.put(portfolio.id(), portfolio);
        }
        List<Portfolio> selected = new ArrayList<>();
        for (Long id : portfolioIds) {
            Portfolio portfolio = byId.get(id);
            if (portfolio == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Portfolio not found: " + id);
            }
            selected.add(portfolio);
        }
        return selected;
    }

    private Portfolio selectedPortfolio(Long portfolioId) {
        List<Portfolio> portfolios = portfolioPort.findByUserId(DEFAULT_USER);
        if (portfolioId == null) {
            return portfolios.stream()
                    .filter(Portfolio::defaultPortfolio)
                    .findFirst()
                    .orElse(portfolios.isEmpty() ? null : portfolios.get(0));
        }
        return portfolios.stream()
                .filter(portfolio -> portfolio.id().equals(portfolioId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Portfolio not found: " + portfolioId));
    }

    private Map<String, LocalDate> earliestAddedDates(Long portfolioId) {
        Map<String, LocalDate> dates = new LinkedHashMap<>();
        for (PortfolioTransaction transaction : transactionPort.findByPortfolioIdAndUserId(portfolioId, DEFAULT_USER)) {
            if (transaction.symbol() == null || transaction.symbol().isBlank()) {
                continue;
            }
            if (transaction.action() != PortfolioTransactionAction.BUY
                    && transaction.action() != PortfolioTransactionAction.MANUAL_VALUATION) {
                continue;
            }
            dates.merge(transaction.symbol().toUpperCase(), transaction.tradeDate(),
                    (current, candidate) -> candidate.isBefore(current) ? candidate : current);
        }
        return dates;
    }

    private String dateString(LocalDate date) {
        return date == null ? null : date.toString();
    }

    private BigDecimal currentPrice(String symbol, BigDecimal fallback) {
        try {
            return priceRefreshService.getFreshLatest(symbol.toUpperCase())
                    .map(PriceHistory::close)
                    .orElse(fallback);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private List<PriceHistory> sortedHistory(String symbol, String range) {
        try {
            return priceRefreshService.getFreshHistory(symbol.toUpperCase(), "1d", range)
                    .stream()
                    .sorted(Comparator.comparing(PriceHistory::timestampAsInstant))
                    .toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private LocalDate latestPriceDate(List<PriceHistory> history) {
        if (history.isEmpty()) {
            return null;
        }
        return history.get(history.size() - 1).timestamp().toLocalDate();
    }

    private BigDecimal dailyReturn(List<PriceHistory> history) {
        if (history.size() < 2) {
            return null;
        }
        BigDecimal previousClose = history.get(history.size() - 2).close();
        BigDecimal latestClose = history.get(history.size() - 1).close();
        return percentOrNull(latestClose.subtract(previousClose), previousClose);
    }

    private BigDecimal returnSince(List<PriceHistory> history, BigDecimal currentPrice, LocalDate latestDate, LocalDate targetDate) {
        if (history.isEmpty() || currentPrice == null || latestDate == null || targetDate == null) {
            return null;
        }
        TreeMap<LocalDate, BigDecimal> byDate = closeByDate(history);
        Map.Entry<LocalDate, BigDecimal> reference = byDate.floorEntry(targetDate);
        if (reference == null || reference.getValue() == null) {
            return null;
        }
        return percentOrNull(currentPrice.subtract(reference.getValue()), reference.getValue());
    }

    private BigDecimal percentOrNull(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        return numerator.multiply(BigDecimal.valueOf(100)).divide(denominator, 4, RoundingMode.HALF_UP);
    }
    private List<String> normalizedBenchmarks(List<String> benchmarks) {
        if (benchmarks == null || benchmarks.isEmpty()) {
            return List.of();
        }
        Set<String> seen = new HashSet<>();
        List<String> normalized = new ArrayList<>();
        for (String benchmark : benchmarks) {
            if (benchmark == null || benchmark.isBlank()) {
                continue;
            }
            String value = benchmark.trim().toUpperCase();
            if (seen.add(value)) {
                normalized.add(value);
            }
        }
        return normalized;
    }

    private ComparisonSeries portfolioComparisonSeries(Portfolio portfolio, String period) {
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(portfolio.id(), DEFAULT_USER);
        List<ComparisonPoint> points = portfolioComparisonPoints(holdings, period);
        return new ComparisonSeries(
                portfolio.id().toString(),
                portfolio.name(),
                "PORTFOLIO",
                portfolio.baseCurrency(),
                points);
    }

    private List<ComparisonPoint> portfolioComparisonPoints(List<PortfolioHolding> holdings, String period) {
        if (holdings.isEmpty()) {
            return List.of();
        }

        Map<String, TreeMap<LocalDate, BigDecimal>> histories = new LinkedHashMap<>();
        for (PortfolioHolding holding : holdings) {
            List<PriceHistory> prices = priceRefreshService.getFreshHistory(
                    holding.symbol().toUpperCase(),
                    "1d",
                    periodToRange(period));
            TreeMap<LocalDate, BigDecimal> byDate = filterHistoryForPeriod(closeByDate(prices), period);
            if (!byDate.isEmpty()) {
                histories.put(holding.symbol().toUpperCase(), byDate);
            }
        }
        if (histories.isEmpty()) {
            return List.of();
        }

        TreeMap<LocalDate, BigDecimal> dates = new TreeMap<>();
        for (TreeMap<LocalDate, BigDecimal> history : histories.values()) {
            history.keySet().forEach(date -> dates.putIfAbsent(date, BigDecimal.ZERO));
        }

        Map<String, BigDecimal> lastCloseBySymbol = new LinkedHashMap<>();
        List<ComparisonPoint> points = new ArrayList<>();
        BigDecimal initialValue = null;
        for (LocalDate date : dates.keySet()) {
            BigDecimal value = BigDecimal.ZERO;
            boolean hasAnyValue = false;
            for (PortfolioHolding holding : holdings) {
                String symbol = holding.symbol().toUpperCase();
                TreeMap<LocalDate, BigDecimal> history = histories.get(symbol);
                if (history == null) {
                    continue;
                }
                BigDecimal close = history.get(date);
                if (close != null) {
                    lastCloseBySymbol.put(symbol, close);
                } else {
                    close = lastCloseBySymbol.get(symbol);
                }
                if (close == null) {
                    continue;
                }
                hasAnyValue = true;
                value = value.add(holding.quantity().multiply(close));
            }
            if (!hasAnyValue || value.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            if (initialValue == null) {
                initialValue = value;
            }
            points.add(new ComparisonPoint(date.toString(), value, percent(value.subtract(initialValue), initialValue)));
        }
        return points;
    }
    private ComparisonSeries benchmarkComparisonSeries(String benchmark, String period) {
        TreeMap<LocalDate, BigDecimal> history = filterHistoryForPeriod(benchmarkHistory(benchmark, period), period);
        List<ComparisonPoint> points = new ArrayList<>();
        BigDecimal initialClose = null;
        for (Map.Entry<LocalDate, BigDecimal> entry : history.entrySet()) {
            BigDecimal close = entry.getValue();
            if (close == null || close.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            if (initialClose == null) {
                initialClose = close;
            }
            points.add(new ComparisonPoint(
                    entry.getKey().toString(),
                    close,
                    percent(close.subtract(initialClose), initialClose)));
        }
        return new ComparisonSeries(
                benchmark.trim().toUpperCase(),
                benchmarkLabel(benchmark),
                "BENCHMARK",
                null,
                points);
    }

    private TreeMap<LocalDate, BigDecimal> filterHistoryForPeriod(TreeMap<LocalDate, BigDecimal> history, String period) {
        LocalDate start = comparisonStartDate(period);
        if (start == null || history.isEmpty()) {
            return history;
        }
        TreeMap<LocalDate, BigDecimal> filtered = new TreeMap<>();
        history.tailMap(start, true).forEach(filtered::put);
        return filtered;
    }

    private LocalDate comparisonStartDate(String period) {
        LocalDate today = LocalDate.now();
        return switch (period.toUpperCase()) {
            case "1M" -> today.minusMonths(1);
            case "3M" -> today.minusMonths(3);
            case "6M" -> today.minusMonths(6);
            case "YTD" -> LocalDate.of(today.getYear(), 1, 1);
            case "1Y" -> today.minusYears(1);
            case "ALL" -> null;
            default -> today.minusMonths(6);
        };
    }
    private TreeMap<LocalDate, BigDecimal> closeByDate(List<PriceHistory> prices) {
        TreeMap<LocalDate, BigDecimal> byDate = new TreeMap<>();
        for (PriceHistory price : prices) {
            byDate.put(price.timestamp().toLocalDate(), price.close());
        }
        return byDate;
    }
    private List<PortfolioPerformancePoint> withBenchmarkValues(
            List<PortfolioPerformancePoint> series,
            TreeMap<LocalDate, BigDecimal> benchmarkHistory) {
        if (series.isEmpty()) {
            return series;
        }
        List<PortfolioPerformancePoint> withBenchmark = new ArrayList<>();
        BigDecimal initialPortfolioValue = series.get(0).portfolioValue();
        BigDecimal firstBenchmarkClose = null;
        BigDecimal lastBenchmarkClose = null;
        for (PortfolioPerformancePoint point : series) {
            LocalDate date = LocalDate.parse(point.date());
            BigDecimal close = benchmarkHistory.get(date);
            if (close != null) {
                lastBenchmarkClose = close;
            } else {
                close = lastBenchmarkClose;
            }
            if (close == null || close.compareTo(BigDecimal.ZERO) <= 0) {
                withBenchmark.add(point);
                continue;
            }
            if (firstBenchmarkClose == null) {
                firstBenchmarkClose = close;
            }
            BigDecimal benchmarkValue = close
                    .multiply(initialPortfolioValue)
                    .divide(firstBenchmarkClose, 4, RoundingMode.HALF_UP);
            withBenchmark.add(new PortfolioPerformancePoint(point.date(), point.portfolioValue(), benchmarkValue));
        }
        return withBenchmark;
    }

    private BigDecimal marketValue(PortfolioPosition position) {
        return position.quantity().multiply(currentPrice(position));
    }

    private BigDecimal dailyPnl(PortfolioPosition position) {
        try {
            List<PriceHistory> prices = priceRefreshService.getFreshHistory(position.symbol().toUpperCase(), "1d", "5d")
                    .stream()
                    .sorted(Comparator.comparing(PriceHistory::timestampAsInstant))
                    .toList();
            if (prices.size() < 2) {
                return BigDecimal.ZERO;
            }
            BigDecimal previousClose = prices.get(prices.size() - 2).close();
            BigDecimal latestClose = prices.get(prices.size() - 1).close();
            return latestClose.subtract(previousClose).multiply(position.quantity());
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal currentPrice(PortfolioPosition position) {
        return priceRefreshService.getFreshLatest(position.symbol().toUpperCase())
                .map(PriceHistory::close)
                .orElse(position.avgCostPrice());
    }

    private BigDecimal sum(List<BigDecimal> values) {
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal percent(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return numerator.multiply(BigDecimal.valueOf(100)).divide(denominator, 4, RoundingMode.HALF_UP);
    }

    private String periodToRange(String period) {
        return switch (period.toUpperCase()) {
            case "1D", "5D" -> "5d";
            case "3M" -> "3mo";
            case "6M" -> "6mo";
            case "1Y" -> "1y";
            case "ALL" -> "5y";
            default -> "1mo";
        };
    }

    private String normalizeComparisonPeriod(String period) {
        if (period == null || period.isBlank()) {
            return "6M";
        }
        String normalized = period.trim().toUpperCase();
        return switch (normalized) {
            case "1M", "3M", "6M", "YTD", "1Y", "ALL" -> normalized;
            case "1A" -> "1M";
            case "3A" -> "3M";
            case "6A" -> "6M";
            case "MAKS", "MAX", "MAKSIMUM" -> "ALL";
            default -> "6M";
        };
    }
    private Instant periodStart(String period, Instant to) {
        return switch (period.toUpperCase()) {
            case "1D" -> to.minusSeconds(1L * 24 * 60 * 60);
            case "5D" -> to.minusSeconds(5L * 24 * 60 * 60);
            case "3M" -> to.minusSeconds(90L * 24 * 60 * 60);
            case "6M" -> to.minusSeconds(180L * 24 * 60 * 60);
            case "1Y" -> to.minusSeconds(365L * 24 * 60 * 60);
            case "ALL" -> Instant.EPOCH;
            default -> to.minusSeconds(30L * 24 * 60 * 60);
        };
    }

    private Double maxDrawdown(List<PortfolioPerformancePoint> series) {
        BigDecimal peak = BigDecimal.ZERO;
        BigDecimal maxDrawdown = BigDecimal.ZERO;
        for (PortfolioPerformancePoint point : series) {
            BigDecimal value = point.portfolioValue();
            if (value.compareTo(peak) > 0) {
                peak = value;
            }
            if (peak.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal drawdown = peak.subtract(value)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(peak, 4, RoundingMode.HALF_UP);
                if (drawdown.compareTo(maxDrawdown) > 0) {
                    maxDrawdown = drawdown;
                }
            }
        }
        return maxDrawdown.doubleValue();
    }

    public record PortfolioSummary(
            BigDecimal totalValue,
            BigDecimal cashBalance,
            BigDecimal dailyPnL,
            BigDecimal dailyPnLPercent,
            BigDecimal totalPnL,
            BigDecimal totalReturn) {
    }

    public record PortfolioPerformance(String period, List<PortfolioPerformancePoint> series,
            PortfolioMetrics metrics) {
    }

    public record PortfolioPerformancePoint(String date, BigDecimal portfolioValue, BigDecimal benchmarkValue) {
    }

    public record PortfolioPerformanceComparison(String period, List<ComparisonSeries> series) {
    }

    public record ComparisonSeries(
            String id,
            String label,
            String type,
            String currency,
            List<ComparisonPoint> points) {
    }
    public record ComparisonPoint(String date, BigDecimal value, BigDecimal returnPct) {
    }

    public record PortfolioPositionPerformance(
            String symbol,
            String company,
            String addedDate,
            BigDecimal costPrice,
            BigDecimal currentPrice,
            BigDecimal marketValue,
            BigDecimal weight,
            BigDecimal dailyReturn,
            BigDecimal weeklyReturn,
            BigDecimal oneMonthReturn,
            BigDecimal threeMonthReturn,
            BigDecimal sixMonthReturn,
            BigDecimal oneYearReturn,
            BigDecimal totalReturn) {
    }
    public record PortfolioMetrics(Double sharpe, Double maxDrawdown) {
    }

    public record PortfolioAllocation(List<AllocationSlice> bySector, List<AllocationSlice> byAsset,
            List<AllocationSlice> byCountry) {
    }

    public record AllocationSlice(String name, BigDecimal value, BigDecimal amount, String color) {
    }

    public record EnrichedPosition(
            String symbol,
            String company,
            BigDecimal shares,
            BigDecimal avgCost,
            BigDecimal currentPrice,
            BigDecimal costBasis,
            BigDecimal marketValue,
            BigDecimal allocation,
            BigDecimal dailyReturn,
            BigDecimal totalReturn,
            BigDecimal unrealizedPnL) {
    }
}
