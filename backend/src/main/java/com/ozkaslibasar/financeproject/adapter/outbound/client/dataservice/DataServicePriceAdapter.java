package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
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

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public DataServicePriceAdapter(RestTemplate restTemplate, PriceNormalizationService priceNormalizationService) {
        this.restTemplate = restTemplate;
        this.priceNormalizationService = priceNormalizationService;
    }

    /**
     * Fetches OHLCV data for {@code symbol} with the specified yfinance-compatible
     * {@code interval} (e.g. {@code "1h"}, {@code "1d"}) and {@code range}
     * (e.g. {@code "5d"}, {@code "1mo"}, {@code "1y"}).
     *
     * @return a non-null, possibly empty list of {@link PriceHistory} records
     */
    public List<PriceHistory> fetchPriceHistory(String symbol, String interval, String range) {
        try {
            String encodedSymbol = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
            String url = baseUrl + "/api/v1/prices/" + encodedSymbol
                    + "?interval=" + interval + "&range=" + range;

            log.info("Fetching price history from data-service: {}", url);

            DataServicePriceDto[] response = restTemplate.getForObject(url, DataServicePriceDto[].class);

            if (response == null || response.length == 0) {
                log.warn("Data-service returned empty response for symbol={} interval={} range={}", symbol, interval, range);
                return Collections.emptyList();
            }

            return Arrays.stream(response)
                    .filter(dto -> dto.getClose() != null)
                    .map(dto -> toPriceHistory(dto, symbol))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Failed to fetch price history from data-service for symbol={}: {}", symbol, e.getMessage());
            return Collections.emptyList();
        }
    }

    private PriceHistory toPriceHistory(DataServicePriceDto dto, String symbol) {
        Instant ts = priceNormalizationService.normalizeYFinanceTimestamp(dto.getTimestamp());

        BigDecimal close = BigDecimal.valueOf(dto.getClose());
        // Fall back to 'close' when optional OHLV fields are missing to keep the domain
        // record valid (e.g. some crypto tickers omit high/low).
        BigDecimal open   = dto.getOpen()   != null ? BigDecimal.valueOf(dto.getOpen())   : close;
        BigDecimal high   = dto.getHigh()   != null ? BigDecimal.valueOf(dto.getHigh())   : close;
        BigDecimal low    = dto.getLow()    != null ? BigDecimal.valueOf(dto.getLow())    : close;
        BigDecimal volume = dto.getVolume() != null ? BigDecimal.valueOf(dto.getVolume()) : BigDecimal.ZERO;

        // Use the backward-compat Instant constructor (open, close, high, low, volume, timestamp)
        return new PriceHistory(symbol, open, close, high, low, volume, ts);
    }
}
