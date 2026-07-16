package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.Watchlist;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetMetadataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public class WatchlistResearchService {

    private static final int MAX_LIMIT = 50;
    private static final int PROVIDER_CONCURRENCY_LIMIT = 5;
    private static final int PROVIDER_TIMEOUT_MILLIS = 5_000;

    private final AssetRepositoryPort assetRepositoryPort;
    private final AssetMetadataPort assetMetadataPort;
    private final PriceRepositoryPort priceRepositoryPort;
    private final PriceChartClientPort priceChartClientPort;
    private final TechnicalAnalysisPort technicalAnalysisPort;
    private final ResearchDataPort researchDataPort;

    public WatchlistResearchService(
            AssetRepositoryPort assetRepositoryPort,
            AssetMetadataPort assetMetadataPort,
            PriceRepositoryPort priceRepositoryPort,
            PriceChartClientPort priceChartClientPort,
            TechnicalAnalysisPort technicalAnalysisPort,
            ResearchDataPort researchDataPort) {
        this.assetRepositoryPort = assetRepositoryPort;
        this.assetMetadataPort = assetMetadataPort;
        this.priceRepositoryPort = priceRepositoryPort;
        this.priceChartClientPort = priceChartClientPort;
        this.technicalAnalysisPort = technicalAnalysisPort;
        this.researchDataPort = researchDataPort;
    }

    public WatchlistResearchSnapshot buildSnapshot(
            Watchlist watchlist,
            List<String> symbols,
            int limit,
            int offset,
            boolean refresh) {
        int boundedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
        int boundedOffset = Math.max(offset, 0);
        List<String> requestedSymbols = requestedSymbols(watchlist, symbols).stream()
                .skip(boundedOffset)
                .limit(boundedLimit)
                .toList();
        List<WatchlistResearchRow> rows = requestedSymbols.stream()
                .map(symbol -> buildRow(symbol, refresh))
                .toList();
        return new WatchlistResearchSnapshot(
                watchlist.id(),
                watchlist.name(),
                watchlist.symbols().size(),
                boundedLimit,
                boundedOffset,
                requestedSymbols,
                rows,
                new WatchlistResearchPolicy(
                        MAX_LIMIT,
                        PROVIDER_CONCURRENCY_LIMIT,
                        PROVIDER_TIMEOUT_MILLIS,
                        true,
                        false),
                Instant.now());
    }

    private WatchlistResearchRow buildRow(String symbol, boolean refresh) {
        MetadataResolution metadata = resolveMetadata(symbol);
        WatchlistResearchSection<WatchlistPriceSummary> price = priceSection(symbol, refresh);
        WatchlistResearchSection<WatchlistTechnicalSummary> technical = technicalSection(symbol);
        WatchlistResearchSection<WatchlistFundamentalSummary> fundamentals = fundamentalSection(symbol);
        WatchlistResearchSection<WatchlistEarningsSummary> earnings = earningsSection(symbol);
        WatchlistResearchSection<WatchlistInstitutionalSummary> institutional = institutionalSection(symbol);
        String overall = overallStatus(List.of(price, technical, fundamentals, earnings, institutional));
        return new WatchlistResearchRow(
                symbol,
                metadata.name(),
                metadata.type(),
                metadata.exchange(),
                metadata.currency(),
                metadata.sector(),
                metadata.industry(),
                metadata.marketCap(),
                metadata.status(),
                metadata.source(),
                price,
                technical,
                fundamentals,
                earnings,
                institutional,
                overall);
    }

    private MetadataResolution resolveMetadata(String symbol) {
        Optional<AssetMetadataPort.AssetMetadata> live = assetMetadataPort.fetchMetadata(symbol);
        if (live.isPresent() && hasVerifiedName(symbol, live.get().name())) {
            AssetMetadataPort.AssetMetadata metadata = live.get();
            return new MetadataResolution(
                    metadata.name(),
                    metadata.type().name(),
                    metadata.exchange(),
                    metadata.currency(),
                    metadata.sector(),
                    metadata.industry(),
                    metadata.marketCap(),
                    "OK",
                    metadata.source() == null ? "data-service" : metadata.source());
        }

        Optional<Asset> stored = assetRepositoryPort.findBySymbol(symbol);
        if (stored.isPresent() && hasVerifiedName(symbol, stored.get().name())) {
            Asset asset = stored.get();
            return new MetadataResolution(asset.name(), asset.type().name(), null, null, null, null, null, "STALE", "asset-repository");
        }

        return new MetadataResolution(null, "STOCK", null, null, null, null, null, "EMPTY", "none");
    }

    private WatchlistResearchSection<WatchlistPriceSummary> priceSection(String symbol, boolean refresh) {
        try {
            Optional<PriceHistory> latest = refresh ? Optional.empty() : priceRepositoryPort.findLatestByAssetId(symbol);
            if (latest.isEmpty()) {
                List<PriceHistory> history = priceChartClientPort.fetchPriceHistory(symbol, "1d", "1mo");
                if (!history.isEmpty()) {
                    priceRepositoryPort.saveAll(history);
                    latest = history.stream().max(Comparator.comparing(PriceHistory::timestamp));
                }
            }
            if (latest.isEmpty()) {
                return section("EMPTY", "price-provider", null, "No real price data is available for this symbol.");
            }
            PriceHistory price = latest.get();
            return section("OK", "price-history", new WatchlistPriceSummary(
                    toDouble(price.close()),
                    toDouble(price.open()),
                    toDouble(price.high()),
                    toDouble(price.low()),
                    toDouble(price.volume()),
                    price.timestampAsInstant().toString()), null);
        } catch (Exception e) {
            return section("FAILED", "price-provider", null, providerMessage(e));
        }
    }

    private WatchlistResearchSection<WatchlistTechnicalSummary> technicalSection(String symbol) {
        try {
            Optional<TechnicalAnalysisPort.TechnicalAnalysisResult> indicators =
                    technicalAnalysisPort.fetchTechnicalAnalysis(symbol, "1d", "6mo");
            Optional<TechnicalAnalysisPort.TechnicalAnalysisResult> signal =
                    technicalAnalysisPort.fetchTechnicalSignals(symbol, "1d", "6mo");
            if (indicators.isEmpty() && signal.isEmpty()) {
                return section("EMPTY", "data-service:technical", null, "Technical provider returned no indicator data.");
            }
            TechnicalAnalysisPort.TechnicalAnalysisResult i = indicators.orElse(null);
            TechnicalAnalysisPort.TechnicalAnalysisResult s = signal.orElse(null);
            return section("OK", "data-service:technical", new WatchlistTechnicalSummary(
                    i == null ? null : i.rsi(),
                    i == null ? null : i.macd(),
                    i == null ? null : i.macdSignal(),
                    i == null ? null : i.sma(),
                    i == null ? null : i.sma20(),
                    i == null ? null : i.sma50(),
                    i == null ? null : i.sma200(),
                    i == null ? null : i.ema(),
                    s == null ? null : s.action(),
                    s == null ? null : s.confidence(),
                    i == null ? s.timestamp() : i.timestamp()), null);
        } catch (RuntimeException e) {
            String message = providerMessage(e);
            String status = message.contains("30 candles") ? "INSUFFICIENT_DATA" : "FAILED";
            return section(status, "data-service:technical", null, message);
        }
    }

    private WatchlistResearchSection<WatchlistFundamentalSummary> fundamentalSection(String symbol) {
        try {
            return researchDataPort.fetchFundamental(symbol)
                    .map(research -> {
                        ResearchDataPort.FundamentalMetrics metrics = research.metrics();
                        return section("OK", "data-service:research", new WatchlistFundamentalSummary(
                                metrics.roe(),
                                metrics.roic(),
                                metrics.grossMargin(),
                                metrics.operatingMargin(),
                                metrics.netMargin(),
                                metrics.debtToEquity(),
                                metrics.revenue(),
                                metrics.netIncome(),
                                metrics.operatingCashFlow(),
                                research.fiscalYear(),
                                research.currency(),
                                research.calculatedAt()), null);
                    })
                    .orElseGet(() -> section("EMPTY", "data-service:research", null, "Fundamental provider returned no data."));
        } catch (Exception e) {
            return section("FAILED", "data-service:research", null, providerMessage(e));
        }
    }

    private WatchlistResearchSection<WatchlistEarningsSummary> earningsSection(String symbol) {
        try {
            List<WatchlistEarningsQuarter> quarters = researchDataPort.fetchEarnings(symbol).stream()
                    .limit(8)
                    .map(q -> new WatchlistEarningsQuarter(q.period(), q.actual(), q.estimate(), q.surprise(), q.surprisePct(), q.beat()))
                    .toList();
            if (quarters.isEmpty()) {
                return section("EMPTY", "data-service:research", null, "Earnings provider returned no data.");
            }
            return section("OK", "data-service:research", new WatchlistEarningsSummary(quarters), null);
        } catch (Exception e) {
            return section("FAILED", "data-service:research", null, providerMessage(e));
        }
    }

    private WatchlistResearchSection<WatchlistInstitutionalSummary> institutionalSection(String symbol) {
        try {
            return researchDataPort.fetchInstitutionalScores(symbol)
                    .map(scores -> section("OK", "data-service:research", new WatchlistInstitutionalSummary(
                            scores.piotroskiFScore(),
                            scores.altmanZScore(),
                            scores.beneishMScore(),
                            scores.qualityComposite(),
                            scores.economicMoat(),
                            scores.earningsQuality()), null))
                    .orElseGet(() -> section("EMPTY", "data-service:research", null, "Institutional provider returned no data."));
        } catch (Exception e) {
            return section("FAILED", "data-service:research", null, providerMessage(e));
        }
    }

    private List<String> requestedSymbols(Watchlist watchlist, List<String> symbols) {
        List<String> source = symbols == null || symbols.isEmpty() ? watchlist.symbols() : symbols;
        return source.stream()
                .filter(symbol -> symbol != null && !symbol.isBlank())
                .flatMap(symbol -> Arrays.stream(symbol.split(",")))
                .map(symbol -> symbol.trim().toUpperCase(Locale.ROOT))
                .filter(symbol -> !symbol.isBlank())
                .distinct()
                .toList();
    }

    private <T> WatchlistResearchSection<T> section(String status, String source, T data, String message) {
        return new WatchlistResearchSection<>(status, source, data, message, Instant.now());
    }

    private String overallStatus(List<WatchlistResearchSection<?>> sections) {
        boolean anyOk = sections.stream().anyMatch(section -> "OK".equals(section.status()));
        if (anyOk) {
            return "OK";
        }
        boolean anyFailed = sections.stream().anyMatch(section -> "FAILED".equals(section.status()));
        if (anyFailed) {
            return "FAILED";
        }
        boolean insufficient = sections.stream().anyMatch(section -> "INSUFFICIENT_DATA".equals(section.status()));
        return insufficient ? "INSUFFICIENT_DATA" : "EMPTY";
    }

    private boolean hasVerifiedName(String symbol, String name) {
        return name != null && !name.isBlank() && !name.equalsIgnoreCase(symbol) && !name.toLowerCase(Locale.ROOT).contains("test asset");
    }

    private String providerMessage(Exception e) {
        return e.getMessage() == null || e.getMessage().isBlank()
                ? "Provider data is temporarily unavailable."
                : e.getMessage();
    }

    private Double toDouble(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }

    private record MetadataResolution(
            String name,
            String type,
            String exchange,
            String currency,
            String sector,
            String industry,
            Long marketCap,
            String status,
            String source) {
    }

    public record WatchlistResearchSnapshot(
            Long watchlistId,
            String watchlistName,
            int totalSymbols,
            int limit,
            int offset,
            List<String> requestedSymbols,
            List<WatchlistResearchRow> rows,
            WatchlistResearchPolicy policy,
            Instant generatedAt) {
    }

    public record WatchlistResearchPolicy(
            int maxLimit,
            int providerConcurrencyLimit,
            int providerTimeoutMillis,
            boolean partialFailureEnabled,
            boolean staleWhileRevalidateEnabled) {
    }

    public record WatchlistResearchRow(
            String symbol,
            String name,
            String type,
            String exchange,
            String currency,
            String sector,
            String industry,
            Long marketCap,
            String metadataStatus,
            String metadataSource,
            WatchlistResearchSection<WatchlistPriceSummary> price,
            WatchlistResearchSection<WatchlistTechnicalSummary> technical,
            WatchlistResearchSection<WatchlistFundamentalSummary> fundamentals,
            WatchlistResearchSection<WatchlistEarningsSummary> earnings,
            WatchlistResearchSection<WatchlistInstitutionalSummary> institutional,
            String overallStatus) {
    }

    public record WatchlistResearchSection<T>(
            String status,
            String source,
            T data,
            String message,
            Instant observedAt) {
    }

    public record WatchlistPriceSummary(
            Double lastPrice,
            Double open,
            Double high,
            Double low,
            Double volume,
            String timestamp) {
    }

    public record WatchlistTechnicalSummary(
            Double rsi14,
            Double macd,
            Double macdSignal,
            Double sma,
            Double sma20,
            Double sma50,
            Double sma200,
            Double ema,
            String action,
            Double confidence,
            String timestamp) {
    }

    public record WatchlistFundamentalSummary(
            Double roe,
            Double roic,
            Double grossMargin,
            Double operatingMargin,
            Double netMargin,
            Double debtToEquity,
            Double revenue,
            Double netIncome,
            Double operatingCashFlow,
            String fiscalYear,
            String currency,
            String calculatedAt) {
    }

    public record WatchlistEarningsQuarter(
            String period,
            Double actual,
            Double estimate,
            Double surprise,
            Double surprisePct,
            Boolean beat) {
    }

    public record WatchlistEarningsSummary(List<WatchlistEarningsQuarter> quarters) {
    }

    public record WatchlistInstitutionalSummary(
            Integer piotroskiFScore,
            Double altmanZScore,
            Double beneishMScore,
            Integer qualityComposite,
            String economicMoat,
            Integer earningsQuality) {
    }
}
