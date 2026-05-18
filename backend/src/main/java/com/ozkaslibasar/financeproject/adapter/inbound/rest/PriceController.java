package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.PriceResponseDto;
import com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper.RestMapper;
import com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice.DataServicePriceAdapter;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@RestController
@RequestMapping("/api/v1/prices")
@RequiredArgsConstructor
@Slf4j
public class PriceController {

    private final PriceRepositoryPort priceRepositoryPort;
    private final DataServicePriceAdapter dataServicePriceAdapter;
    private final RestMapper mapper;

    @GetMapping("/{symbol}/latest")
    @Cacheable(value = "latestPriceCache", key = "#symbol")
    public PriceResponseDto getLatestPrice(@PathVariable String symbol) {
        return priceRepositoryPort.findLatestByAssetId(symbol)
                .map(mapper::toPriceResponseDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Price not found"));
    }

    /**
     * Returns OHLCV candlestick series for the given symbol.
     *
     * <p>Checks the local database first.  If no records exist for the requested
     * period, an on-demand fetch is triggered against the FastAPI data-service,
     * the results are persisted to the database, and the data is returned to the
     * caller.</p>
     *
     * @param symbol   ticker symbol (e.g. {@code "AAPL"})
     * @param interval yfinance interval string — {@code "1h"}, {@code "1d"}, {@code "1wk"}, {@code "1mo"}, {@code "1y"}
     * @param range    yfinance range string   — {@code "5d"}, {@code "1mo"}, {@code "6mo"}, {@code "2y"}, {@code "5y"}
     */
    @GetMapping("/{symbol}/history")
    public List<PriceResponseDto> getPriceHistory(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1d")   String interval,
            @RequestParam(defaultValue = "1mo")  String range) {

        Instant from = rangeToInstant(range);
        Instant now  = Instant.now();

        List<PriceHistory> prices = priceRepositoryPort.findByAssetIdAndPeriod(symbol, from, now);

        if (prices.isEmpty()) {
            log.info("No local price data for {} ({} / {}); fetching from data-service", symbol, interval, range);
            List<PriceHistory> fetched = dataServicePriceAdapter.fetchPriceHistory(symbol, interval, range);
            if (!fetched.isEmpty()) {
                try {
                    priceRepositoryPort.saveAll(fetched);
                } catch (Exception e) {
                    log.warn("Could not persist on-demand prices for {}: {}", symbol, e.getMessage());
                }
                prices = fetched;
            }
        }

        return mapper.toPriceResponseDtoList(prices);
    }

    /**
     * Converts a yfinance-style range string to an {@link Instant} representing
     * the start of the requested window.
     */
    private Instant rangeToInstant(String range) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime from = switch (range) {
            case "5d"  -> now.minusDays(5);
            case "1mo" -> now.minusMonths(1);
            case "3mo" -> now.minusMonths(3);
            case "6mo" -> now.minusMonths(6);
            case "1y"  -> now.minusYears(1);
            case "2y"  -> now.minusYears(2);
            case "5y"  -> now.minusYears(5);
            default    -> now.minusMonths(1);
        };
        return from.toInstant(ZoneOffset.UTC);
    }
}
