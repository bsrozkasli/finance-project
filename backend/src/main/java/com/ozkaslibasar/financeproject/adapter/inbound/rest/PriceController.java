package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.PriceResponseDto;
import com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper.RestMapper;
import com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice.DataServicePriceAdapter;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

@Tag(name = "Prices", description = "Latest price and historical OHLCV endpoints")
@RestController
@RequestMapping("/api/v1/prices")
@RequiredArgsConstructor
@Slf4j
public class PriceController {

    private static final String LIVE_PRICE_RANGE = "5d";

    private final PriceRepositoryPort priceRepositoryPort;
    private final DataServicePriceAdapter dataServicePriceAdapter;
    private final RestMapper mapper;

    @Operation(summary = "GET Prices endpoint", description = "Implements the GET operation for the Prices API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/{symbol}/latest")
    public PriceResponseDto getLatestPrice(@PathVariable String symbol) {
        String normalizedSymbol = normalizeSymbol(symbol);
        PriceHistory latest = priceRepositoryPort.findLatestByAssetId(normalizedSymbol).orElse(null);

        if (latest == null || isBeforeToday(latest, Instant.now())) {
            List<PriceHistory> fetched = fetchAndPersist(normalizedSymbol, "1d", LIVE_PRICE_RANGE);
            latest = newestOf(latest, fetched);
        }

        if (latest == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Price not found");
        }
        return mapper.toPriceResponseDto(latest);
    }

    /**
     * Returns OHLCV candlestick series for the given symbol.
     *
     * <p>Checks the local database first. If records are missing or stale for the
     * requested window, an on-demand fetch is triggered against the FastAPI
     * data-service, and fetched bars are upserted into the database.</p>
     *
     * @param symbol   ticker symbol (e.g. {@code "AAPL"})
     * @param interval yfinance interval string - {@code "1h"}, {@code "1d"}, {@code "1wk"}, {@code "1mo"}, {@code "1y"}
     * @param range    yfinance range string   - {@code "5d"}, {@code "1mo"}, {@code "6mo"}, {@code "2y"}, {@code "5y"}
     */
    @Operation(summary = "GET Prices endpoint", description = "Implements the GET operation for the Prices API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/{symbol}/history")
    public List<PriceResponseDto> getPriceHistory(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1d") String interval,
            @RequestParam(defaultValue = "1mo") String range) {

        String normalizedSymbol = normalizeSymbol(symbol);
        Instant from = rangeToInstant(range);
        Instant now = Instant.now();

        List<PriceHistory> prices = priceRepositoryPort.findByAssetIdAndPeriod(normalizedSymbol, from, now);

        if (shouldRefresh(prices, interval, range, now)) {
            log.info("Refreshing price data for {} ({} / {}) from data-service", normalizedSymbol, interval, range);
            List<PriceHistory> fetched = fetchAndPersist(normalizedSymbol, interval, range);
            if (!fetched.isEmpty()) {
                prices = mergeByTimestamp(prices, fetched).stream()
                        .filter(price -> !price.timestampAsInstant().isBefore(from))
                        .filter(price -> !price.timestampAsInstant().isAfter(now))
                        .toList();
            }
        }

        return mapper.toPriceResponseDtoList(prices);
    }

    private List<PriceHistory> fetchAndPersist(String symbol, String interval, String range) {
        List<PriceHistory> fetched = dataServicePriceAdapter.fetchPriceHistory(symbol, interval, range);
        if (fetched == null || fetched.isEmpty()) {
            return List.of();
        }
        try {
            priceRepositoryPort.saveAll(fetched);
        } catch (Exception e) {
            log.warn("Could not persist on-demand prices for {}: {}", symbol, e.getMessage());
        }
        return fetched;
    }

    private boolean shouldRefresh(List<PriceHistory> prices, String interval, String range, Instant now) {
        if (prices.isEmpty()) {
            return true;
        }
        if (LIVE_PRICE_RANGE.equals(range) || isIntradayInterval(interval)) {
            return true;
        }
        PriceHistory latest = prices.stream()
                .max(Comparator.comparing(PriceHistory::timestampAsInstant))
                .orElse(null);
        return latest == null || isBeforeToday(latest, now);
    }

    private boolean isIntradayInterval(String interval) {
        return interval.endsWith("m") || interval.endsWith("h");
    }

    private boolean isBeforeToday(PriceHistory price, Instant now) {
        LocalDate latestDate = price.timestamp().toLocalDate();
        LocalDate today = LocalDateTime.ofInstant(now, ZoneOffset.UTC).toLocalDate();
        return latestDate.isBefore(today);
    }

    private PriceHistory newestOf(PriceHistory existing, List<PriceHistory> fetched) {
        List<PriceHistory> candidates = new ArrayList<>(fetched);
        if (existing != null) {
            candidates.add(existing);
        }
        return candidates.stream()
                .max(Comparator.comparing(PriceHistory::timestampAsInstant))
                .orElse(null);
    }

    private List<PriceHistory> mergeByTimestamp(List<PriceHistory> local, List<PriceHistory> fetched) {
        Map<Instant, PriceHistory> merged = new TreeMap<>();
        local.forEach(price -> merged.put(price.timestampAsInstant(), price));
        fetched.forEach(price -> merged.put(price.timestampAsInstant(), price));
        return new ArrayList<>(merged.values());
    }

    private String normalizeSymbol(String symbol) {
        return symbol.trim().toUpperCase(Locale.ROOT);
    }

    /**
     * Converts a yfinance-style range string to an {@link Instant} representing
     * the start of the requested window.
     */
    private Instant rangeToInstant(String range) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime from = switch (range) {
            case "5d" -> now.minusDays(5);
            case "1mo" -> now.minusMonths(1);
            case "3mo" -> now.minusMonths(3);
            case "6mo" -> now.minusMonths(6);
            case "1y" -> now.minusYears(1);
            case "2y" -> now.minusYears(2);
            case "5y" -> now.minusYears(5);
            default -> now.minusMonths(1);
        };
        return from.toInstant(ZoneOffset.UTC);
    }
}

