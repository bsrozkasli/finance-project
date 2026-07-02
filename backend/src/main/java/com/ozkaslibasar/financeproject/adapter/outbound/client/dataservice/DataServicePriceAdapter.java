package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import com.ozkaslibasar.financeproject.domain.service.PriceNormalizationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Outbound adapter that fetches OHLCV price series from the local FastAPI data-service.
 *
 * <p>Endpoint: {@code GET /api/v1/prices/{symbol}?interval={interval}&range={range}}</p>
 *
 * <p>Errors (network, empty response, parse failures) are caught and logged; the adapter
 * always returns an empty list rather than propagating exceptions, so callers can apply
 * a graceful fallback strategy.</p>
 */
@Component
@Slf4j
public class DataServicePriceAdapter {

    private final RestTemplate restTemplate;

    private final PriceNormalizationService priceNormalizationService;
    private final MeterRegistry meterRegistry;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public DataServicePriceAdapter(RestTemplate restTemplate, PriceNormalizationService priceNormalizationService, MeterRegistry meterRegistry) {
        this.restTemplate = restTemplate;
        this.priceNormalizationService = priceNormalizationService;
        this.meterRegistry = meterRegistry;
    }

    /**
     * Fetches OHLCV data for {@code symbol} with the specified yfinance-compatible
     * {@code interval} (e.g. {@code "1h"}, {@code "1d"}) and {@code range}
     * (e.g. {@code "5d"}, {@code "1mo"}, {@code "1y"}).
     *
     * @return a non-null, possibly empty list of {@link PriceHistory} records
     */
    public List<PriceHistory> fetchPriceHistory(String symbol, String interval, String range) {
        Timer.Sample sample = Timer.start(meterRegistry);
        String result = "error";
        try {
            String encodedSymbol = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
            String url = baseUrl + "/api/v1/prices/" + encodedSymbol
                    + "?interval=" + interval + "&range=" + range;

            log.info("operation=price_history provider=data-service symbol={} interval={} range={} result=request_start url={}", symbol, interval, range, url);

            DataServicePriceDto[] response = restTemplate.getForObject(url, DataServicePriceDto[].class);

            if (response == null || response.length == 0) {
                log.warn("operation=price_history provider=data-service symbol={} interval={} range={} result=empty", symbol, interval, range);
                result = "empty";
                return Collections.emptyList();
            }

            List<PriceHistory> parsed = Arrays.stream(response)
                    .map(dto -> toPriceHistory(dto, symbol))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            result = parsed.isEmpty() ? "empty" : "success";
            return parsed;

        } catch (Exception e) {
            log.error("operation=price_history provider=data-service symbol={} interval={} range={} result=error reason={}", symbol, interval, range, e.getMessage());
            result = "error";
            return Collections.emptyList();
        } finally {
            meterRegistry.counter("provider_request_total", "provider", "data-service", "operation", "price_history", "result", result).increment();
            sample.stop(meterRegistry.timer("dataservice_request_latency_seconds", "endpoint", "prices", "result", result));
        }
    }

    private PriceHistory toPriceHistory(DataServicePriceDto dto, String symbol) {
        if (dto.getTimestamp() == null
                || dto.getOpen() == null
                || dto.getHigh() == null
                || dto.getLow() == null
                || dto.getClose() == null
                || dto.getVolume() == null) {
            log.warn("operation=price_history provider=data-service symbol={} result=skip_incomplete_bar timestamp={}", symbol, dto.getTimestamp());
            return null;
        }

        try {
            Instant ts = priceNormalizationService.normalizeYFinanceTimestamp(dto.getTimestamp());

            BigDecimal open = BigDecimal.valueOf(dto.getOpen());
            BigDecimal high = BigDecimal.valueOf(dto.getHigh());
            BigDecimal low = BigDecimal.valueOf(dto.getLow());
            BigDecimal close = BigDecimal.valueOf(dto.getClose());
            BigDecimal volume = BigDecimal.valueOf(dto.getVolume());

            // Use the backward-compat Instant constructor (open, close, high, low, volume, timestamp)
            return new PriceHistory(symbol, open, close, high, low, volume, ts);
        } catch (Exception e) {
            log.warn("operation=price_history provider=data-service symbol={} result=skip_invalid_bar timestamp={} reason={}", symbol, dto.getTimestamp(), e.getMessage());
            return null;
        }
    }
}
