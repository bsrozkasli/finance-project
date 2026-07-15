package com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo;

import com.ozkaslibasar.financeproject.adapter.outbound.client.guard.MarketDataPriority;
import com.ozkaslibasar.financeproject.adapter.outbound.client.guard.ProviderRequestGuard;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetMetadataStatus;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
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

@Component
@Slf4j
public class YahooFinancePriceAdapter implements PriceChartClientPort {

    private static final String YAHOO_PROVIDER = "YAHOO";
    private static final String YAHOO_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

    private final RestTemplate restTemplate;
    private final MeterRegistry meterRegistry;
    private final ProviderRequestGuard requestGuard;

    public YahooFinancePriceAdapter(
            RestTemplate restTemplate,
            MeterRegistry meterRegistry,
            ProviderRequestGuard requestGuard) {
        this.restTemplate = restTemplate;
        this.meterRegistry = meterRegistry;
        this.requestGuard = requestGuard;
    }

    @Override
    public List<PriceHistory> fetchPriceHistory(String symbol, String interval, String range) {
        return requestGuard.execute(
                YAHOO_PROVIDER,
                "price_history",
                symbol,
                MarketDataPriority.WATCHLIST,
                () -> fetchPriceHistoryUnchecked(symbol, interval, range),
                Collections.emptyList());
    }

    @Override
    public Optional<Asset> fetchAssetInfo(String symbol) {
        return requestGuard.execute(
                YAHOO_PROVIDER,
                "asset_info",
                symbol,
                MarketDataPriority.VISIBLE,
                () -> fetchAssetInfoUnchecked(symbol),
                Optional.empty());
    }

    private List<PriceHistory> fetchPriceHistoryUnchecked(String symbol, String interval, String range) {
        String url = YAHOO_BASE_URL + "/" + symbol + "?interval=" + interval + "&range=" + range;
        log.info("operation=price_history provider=yahoo symbol={} interval={} range={} result=request_start", symbol, interval, range);
        YahooChartResponseDto response = restTemplate.getForObject(url, YahooChartResponseDto.class);
        List<PriceHistory> parsed = parseResponse(symbol, response);
        meterRegistry.counter("data.ingestion.success", "provider", "YFinance").increment();
        return parsed;
    }

    private Optional<Asset> fetchAssetInfoUnchecked(String symbol) {
        String url = YAHOO_BASE_URL + "/" + symbol + "?interval=1d&range=5d";
        log.info("operation=asset_info provider=yahoo symbol={} result=request_start", symbol);
        YahooChartResponseDto response = restTemplate.getForObject(url, YahooChartResponseDto.class);

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

        AssetType type = inferAssetType(meta.getExchangeName());
        Asset asset = new Asset(
                meta.getSymbol() != null ? meta.getSymbol() : symbol,
                meta.getSymbol() != null ? meta.getSymbol() : symbol,
                type,
                meta.getExchangeName(),
                meta.getCurrency(),
                YAHOO_PROVIDER,
                meta.getSymbol() != null ? meta.getSymbol() : symbol,
                AssetMetadataStatus.PARTIAL);
        meterRegistry.counter("data.ingestion.success", "provider", "YFinance").increment();
        return Optional.of(asset);
    }

    private List<PriceHistory> parseResponse(String symbol, YahooChartResponseDto response) {
        if (response == null
                || response.getChart() == null
                || response.getChart().getResult() == null
                || response.getChart().getResult().isEmpty()) {
            log.warn("operation=price_history provider=yahoo symbol={} result=empty reason=no_result_block", symbol);
            return Collections.emptyList();
        }

        var result = response.getChart().getResult().get(0);
        var timestamps = result.getTimestamp();
        if (timestamps == null || timestamps.isEmpty()) {
            log.warn("operation=price_history provider=yahoo symbol={} result=empty reason=no_timestamps", symbol);
            return Collections.emptyList();
        }

        if (result.getIndicators() == null
                || result.getIndicators().getQuote() == null
                || result.getIndicators().getQuote().isEmpty()) {
            log.warn("operation=price_history provider=yahoo symbol={} result=empty reason=no_quote_indicators", symbol);
            return Collections.emptyList();
        }

        var quote = result.getIndicators().getQuote().get(0);
        return IntStream.range(0, timestamps.size())
                .filter(i -> safeGet(quote.getClose(), i) != null)
                .mapToObj(i -> toBar(symbol, timestamps, quote, i))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private PriceHistory toBar(String symbol, List<Long> timestamps, YahooChartResponseDto.Quote quote, int i) {
        try {
            Instant ts = Instant.ofEpochSecond(timestamps.get(i));
            BigDecimal close = toBd(safeGet(quote.getClose(), i));
            BigDecimal open = toBd(safeGet(quote.getOpen(), i));
            BigDecimal high = toBd(safeGet(quote.getHigh(), i));
            BigDecimal low = toBd(safeGet(quote.getLow(), i));
            Long rawVol = safeGet(quote.getVolume(), i);
            if (open == null || high == null || low == null || close == null || rawVol == null) {
                log.debug("operation=price_history provider=yahoo symbol={} result=skip_incomplete_bar index={}", symbol, i);
                return null;
            }
            BigDecimal volume = BigDecimal.valueOf(rawVol);
            if (high.compareTo(low) < 0) {
                high = low;
            }
            return new PriceHistory(symbol, open, close, high, low, volume, ts);
        } catch (Exception e) {
            log.debug("operation=price_history provider=yahoo symbol={} result=skip_malformed_bar index={} reason={}", symbol, i, e.getMessage());
            return null;
        }
    }

    private <T> T safeGet(List<T> list, int index) {
        if (list == null || index >= list.size()) {
            return null;
        }
        return list.get(index);
    }

    private BigDecimal toBd(Double value) {
        if (value == null || Double.isNaN(value) || Double.isInfinite(value)) {
            return null;
        }
        return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP);
    }

    private AssetType inferAssetType(String exchangeName) {
        if (exchangeName == null) {
            return AssetType.STOCK;
        }
        String upper = exchangeName.toUpperCase();
        if (upper.contains("ETF") || upper.contains("NYSEARCA") || upper.contains("BATS")) {
            return AssetType.ETF;
        }
        if (upper.contains("INDEX")) {
            return AssetType.INDEX;
        }
        if (upper.contains("CRYPTO")) {
            return AssetType.CRYPTO;
        }
        return AssetType.STOCK;
    }
}
