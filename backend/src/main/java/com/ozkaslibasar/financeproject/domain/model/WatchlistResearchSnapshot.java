package com.ozkaslibasar.financeproject.domain.model;

import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record WatchlistResearchSnapshot(
        Long watchlistId,
        String watchlistName,
        int totalSymbols,
        int limit,
        int offset,
        List<String> requestedSymbols,
        List<WatchlistResearchRow> rows,
        WatchlistResearchPolicy policy,
        Instant generatedAt
) {

    public record WatchlistResearchPolicy(
            int maxLimit,
            int providerConcurrencyLimit,
            int providerTimeoutMillis,
            boolean partialFailureEnabled,
            boolean staleWhileRevalidateEnabled
    ) {
    }

    public record WatchlistResearchRow(
            String symbol,
            WatchlistResearchSection<PriceSummary> price,
            WatchlistResearchSection<TechnicalSummary> technical,
            WatchlistResearchSection<FundamentalSummary> fundamentals,
            WatchlistResearchSection<EarningsSummary> earnings,
            WatchlistResearchSection<InstitutionalSummary> institutional,
            WatchlistResearchStatus overallStatus
    ) {
    }

    public record WatchlistResearchSection<T>(
            WatchlistResearchStatus status,
            String source,
            T data,
            String message,
            Instant observedAt
    ) {
        public static <T> WatchlistResearchSection<T> ok(String source, T data, Instant observedAt) {
            return new WatchlistResearchSection<>(WatchlistResearchStatus.OK, source, data, null, observedAt);
        }

        public static <T> WatchlistResearchSection<T> empty(String source, String message, Instant observedAt) {
            return new WatchlistResearchSection<>(WatchlistResearchStatus.EMPTY, source, null, message, observedAt);
        }

        public static <T> WatchlistResearchSection<T> failed(WatchlistResearchStatus status, String source, String message, Instant observedAt) {
            return new WatchlistResearchSection<>(status, source, null, message, observedAt);
        }
    }

    public record PriceSummary(
            BigDecimal lastPrice,
            BigDecimal open,
            BigDecimal high,
            BigDecimal low,
            BigDecimal volume,
            Instant timestamp
    ) {
    }

    public record TechnicalSummary(
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
            String timestamp
    ) {
        public static TechnicalSummary from(TechnicalAnalysisPort.TechnicalAnalysisResult result) {
            return new TechnicalSummary(
                    result.rsi(),
                    result.macd(),
                    result.macdSignal(),
                    result.sma(),
                    result.sma20(),
                    result.sma50(),
                    result.sma200(),
                    result.ema(),
                    result.action(),
                    result.confidence(),
                    result.timestamp());
        }
    }

    public record FundamentalSummary(
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
            String calculatedAt
    ) {
        public static FundamentalSummary from(ResearchDataPort.FundamentalResearch research) {
            ResearchDataPort.FundamentalMetrics metrics = research.metrics();
            if (metrics == null) {
                return new FundamentalSummary(null, null, null, null, null, null, null, null, null,
                        research.fiscalYear(), research.currency(), research.calculatedAt());
            }
            return new FundamentalSummary(
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
                    research.calculatedAt());
        }
    }

    public record EarningsSummary(
            List<ResearchDataPort.EarningsQuarter> quarters
    ) {
    }

    public record InstitutionalSummary(
            Integer piotroskiFScore,
            Double altmanZScore,
            Double beneishMScore,
            Integer qualityComposite,
            String economicMoat,
            Integer earningsQuality
    ) {
        public static InstitutionalSummary from(ResearchDataPort.InstitutionalScores scores) {
            return new InstitutionalSummary(
                    scores.piotroskiFScore(),
                    scores.altmanZScore(),
                    scores.beneishMScore(),
                    scores.qualityComposite(),
                    scores.economicMoat(),
                    scores.earningsQuality());
        }
    }
}
