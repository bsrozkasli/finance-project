package com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import lombok.extern.slf4j.Slf4j;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Outbound adapter implementing {@link PriceChartClientPort} by calling the
 * Yahoo Finance Chart API v8 directly over HTTPS.
 *
 * <p>Yahoo returns nullable arrays — every index position corresponds to one bar.
 * Bars where {@code close} is {@code null} are market holidays or gaps and are
 * filtered out before mapping, per the project's data-integrity rules.</p>
 *
 * <p>All {@code Double} values are converted to {@link BigDecimal} using
 * {@code BigDecimal.valueOf(double)} (exact decimal representation) and rounded
 * to 4 decimal places before being stored in the domain record.</p>
 *
 * <p>Rate-limiting is enforced at the infrastructure level (Resilience4j config);
 * no annotation is required here because Yahoo is an unlimited free endpoint.</p>
 */
@Component
@Slf4j
public class YahooFinancePriceAdapter implements PriceChartClientPort {

    private static final String YAHOO_BASE_URL =
            "https://query1.finance.yahoo.com/v8/finance/chart";

    private final RestTemplate restTemplate;
    private final MeterRegistry meterRegistry;

    public YahooFinancePriceAdapter(RestTemplate restTemplate, MeterRegistry meterRegistry) {
        this.restTemplate = restTemplate;
        this.meterRegistry = meterRegistry;
    }

    /**
     * {@inheritDoc}
     *
     * <p>Fetches from:
     * {@code GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={interval}&range={range}}</p>
     *
     * @param symbol   Yahoo-compatible ticker (e.g. {@code "AAPL"}, {@code "THYAO.IS"})
     * @param interval bar size (e.g. {@code "1d"}, {@code "1h"})
     * @param range    lookback window (e.g. {@code "1mo"}, {@code "1y"})
     */
    @Override
    public List<PriceHistory> fetchPriceHistory(String symbol, String interval, String range) {
        try {
            String url = YAHOO_BASE_URL + "/" + symbol
                    + "?interval=" + interval + "&range=" + range;
            log.info("Fetching Yahoo Finance price history: {}", url);

            YahooChartResponseDto response =
                    restTemplate.getForObject(url, YahooChartResponseDto.class);

            List<PriceHistory> parsed = parseResponse(symbol, response);
            meterRegistry.counter("data.ingestion.success", "provider", "YFinance").increment();
            return parsed;

        } catch (Exception e) {
            log.error("Failed to fetch Yahoo price history for symbol={}: {}", symbol, e.getMessage());
            meterRegistry.counter("data.ingestion.error", "provider", "YFinance").increment();
            return Collections.emptyList();
        }
    }

    /**
     * {@inheritDoc}
     *
     * <p>Uses the chart endpoint with a short {@code "5d"} / {@code "1d"} range to
     * retrieve the meta block, from which we extract name and currency for a
     * minimal {@link Asset} record. This is only used during initial asset bootstrap.</p>
     */
    @Override
    public Optional<Asset> fetchAssetInfo(String symbol) {
        try {
            String url = YAHOO_BASE_URL + "/" + symbol + "?interval=1d&range=5d";
            log.info("Fetching Yahoo asset info for symbol={}", symbol);

            YahooChartResponseDto response =
                    restTemplate.getForObject(url, YahooChartResponseDto.class);

            if (response == null
                    || response.getChart() == null
                    || response.getChart().getResult() == null
                    || response.getChart().getResult().isEmpty()) {
                meterRegistry.counter("data.ingestion.success", "provider", "YFinance").increment();
                return Optional.empty();
            }

            var meta = response.getChart().getResult().get(0).getMeta();
            if (meta == null) {
                meterRegistry.counter("data.ingestion.success", "provider", "YFinance").increment();
                return Optional.empty();
            }

            // Infer type from exchange name; default to STOCK
            AssetType type = inferAssetType(meta.getExchangeName());

            Optional<Asset> result = Optional.of(new Asset(
                    meta.getSymbol() != null ? meta.getSymbol() : symbol,
                    symbol,   // Yahoo does not return company name in the chart endpoint
                    type
            ));
            meterRegistry.counter("data.ingestion.success", "provider", "YFinance").increment();
            return result;

        } catch (Exception e) {
            log.error("Failed to fetch Yahoo asset info for symbol={}: {}", symbol, e.getMessage());
            meterRegistry.counter("data.ingestion.error", "provider", "YFinance").increment();
            return Optional.empty();
        }
    }




    // ─── private helpers ────────────────────────────────────────────────────────

    /**
     * Parses a raw Yahoo response into a list of {@link PriceHistory} domain records.
     *
     * <p>Bars where {@code close} is {@code null} (market holidays, gaps) are
     * silently skipped. This is intentional: persisting null prices would violate
     * the domain record's compact-constructor invariants.</p>
     */
    private List<PriceHistory> parseResponse(String symbol, YahooChartResponseDto response) {
        if (response == null
                || response.getChart() == null
                || response.getChart().getResult() == null
                || response.getChart().getResult().isEmpty()) {
            log.warn("Yahoo returned no result block for symbol={}", symbol);
            return Collections.emptyList();
        }

        var result = response.getChart().getResult().get(0);
        var timestamps = result.getTimestamp();
        if (timestamps == null || timestamps.isEmpty()) {
            log.warn("Yahoo returned no timestamps for symbol={}", symbol);
            return Collections.emptyList();
        }

        if (result.getIndicators() == null
                || result.getIndicators().getQuote() == null
                || result.getIndicators().getQuote().isEmpty()) {
            log.warn("Yahoo returned no quote indicators for symbol={}", symbol);
            return Collections.emptyList();
        }

        var quote = result.getIndicators().getQuote().get(0);

        return IntStream.range(0, timestamps.size())
                .filter(i -> {
                    // Skip bars with null close — they are non-trading gaps
                    Double closeVal = safeGet(quote.getClose(), i);
                    return closeVal != null;
                })
                .mapToObj(i -> toBar(symbol, timestamps, quote, i))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Converts one bar's parallel arrays into a {@link PriceHistory} record.
     * Falls back to {@code close} for any missing OHLV field to maintain invariants.
     */
    private PriceHistory toBar(
            String symbol,
            List<Long> timestamps,
            YahooChartResponseDto.Quote quote,
            int i) {

        try {
            Instant ts = Instant.ofEpochSecond(timestamps.get(i));

            BigDecimal close  = toBd(safeGet(quote.getClose(), i));
            BigDecimal open   = orElse(toBd(safeGet(quote.getOpen(),   i)), close);
            BigDecimal high   = orElse(toBd(safeGet(quote.getHigh(),   i)), close);
            BigDecimal low    = orElse(toBd(safeGet(quote.getLow(),    i)), close);
            Long rawVol = safeGet(quote.getVolume(), i);
            BigDecimal volume = rawVol != null
                    ? BigDecimal.valueOf(rawVol)
                    : BigDecimal.ZERO;

            // Ensure high >= low (occasionally Yahoo data has rounding glitches)
            if (high.compareTo(low) < 0) {
                high = low;
            }

            return new PriceHistory(symbol, open, close, high, low, volume, ts);

        } catch (Exception e) {
            log.debug("Skipping malformed bar at index={} for symbol={}: {}", i, symbol, e.getMessage());
            return null;
        }
    }

    /** Null-safe list accessor. */
    private <T> T safeGet(List<T> list, int index) {
        if (list == null || index >= list.size()) return null;
        return list.get(index);
    }

    /** Converts a nullable Double to BigDecimal(scale=4), or null if input is null/NaN. */
    private BigDecimal toBd(Double value) {
        if (value == null || Double.isNaN(value) || Double.isInfinite(value)) return null;
        return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP);
    }

    /** Returns {@code value} if non-null, otherwise {@code fallback}. */
    private BigDecimal orElse(BigDecimal value, BigDecimal fallback) {
        return value != null ? value : fallback;
    }

    /** Infers AssetType from Yahoo's exchangeName string. */
    private AssetType inferAssetType(String exchangeName) {
        if (exchangeName == null) return AssetType.STOCK;
        String upper = exchangeName.toUpperCase();
        if (upper.contains("ETF"))    return AssetType.ETF;
        if (upper.contains("INDEX"))  return AssetType.INDEX;
        if (upper.contains("CRYPTO")) return AssetType.CRYPTO;
        return AssetType.STOCK;
    }
}
