package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeMap;

/**
 * Pure domain service for reading prices through the local store first and
 * refreshing from the provider chain when the requested window should be fresh.
 */
public class PriceRefreshService {

    private static final String LIVE_PRICE_RANGE = "5d";

    private final PriceRepositoryPort priceRepository;
    private final FinancialDataPort financialDataPort;

    public PriceRefreshService(PriceRepositoryPort priceRepository, FinancialDataPort financialDataPort) {
        this.priceRepository = Objects.requireNonNull(priceRepository, "priceRepository must not be null");
        this.financialDataPort = Objects.requireNonNull(financialDataPort, "financialDataPort must not be null");
    }

    public Optional<PriceHistory> getFreshLatest(String symbol) {
        String normalizedSymbol = normalizeSymbol(symbol);
        PriceHistory latest = priceRepository.findLatestByAssetId(normalizedSymbol).orElse(null);

        List<PriceHistory> fetched = fetchAndPersist(normalizedSymbol, "1d", LIVE_PRICE_RANGE);
        return newestOf(latest, fetched);
    }

    public List<PriceHistory> getFreshHistory(String symbol, String interval, String range) {
        String normalizedSymbol = normalizeSymbol(symbol);
        String safeInterval = interval == null || interval.isBlank() ? "1d" : interval;
        String safeRange = range == null || range.isBlank() ? "1mo" : range;
        Instant from = rangeToInstant(safeRange);
        Instant now = Instant.now();

        List<PriceHistory> prices = priceRepository.findByAssetIdAndPeriod(normalizedSymbol, from, now);
        if (shouldRefresh(prices, safeInterval, safeRange, now)) {
            List<PriceHistory> fetched = fetchAndPersist(normalizedSymbol, safeInterval, safeRange);
            if (!fetched.isEmpty()) {
                prices = mergeByTimestamp(prices, fetched).stream()
                        .filter(price -> !price.timestampAsInstant().isBefore(from))
                        .filter(price -> !price.timestampAsInstant().isAfter(now))
                        .toList();
            }
        }
        return prices;
    }

    private List<PriceHistory> fetchAndPersist(String symbol, String interval, String range) {
        List<PriceHistory> fetched = financialDataPort.fetchPriceHistory(symbol, interval, range);
        if (fetched == null || fetched.isEmpty()) {
            return List.of();
        }
        priceRepository.saveAll(fetched);
        return fetched;
    }

    private Optional<PriceHistory> newestOf(PriceHistory existing, List<PriceHistory> fetched) {
        List<PriceHistory> candidates = new ArrayList<>(fetched);
        if (existing != null) {
            candidates.add(existing);
        }
        return candidates.stream().max(Comparator.comparing(PriceHistory::timestampAsInstant));
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
        return price.timestamp().toLocalDate()
                .isBefore(LocalDateTime.ofInstant(now, ZoneOffset.UTC).toLocalDate());
    }

    private List<PriceHistory> mergeByTimestamp(List<PriceHistory> local, List<PriceHistory> fetched) {
        Map<Instant, PriceHistory> merged = new TreeMap<>();
        local.forEach(price -> merged.put(price.timestampAsInstant(), price));
        fetched.forEach(price -> merged.put(price.timestampAsInstant(), price));
        return new ArrayList<>(merged.values());
    }

    private Instant rangeToInstant(String range) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime from = switch (range) {
            case "5d" -> now.minusDays(5);
            case "3mo" -> now.minusMonths(3);
            case "6mo" -> now.minusMonths(6);
            case "1y" -> now.minusYears(1);
            case "2y" -> now.minusYears(2);
            case "5y" -> now.minusYears(5);
            default -> now.minusMonths(1);
        };
        return from.toInstant(ZoneOffset.UTC);
    }

    private String normalizeSymbol(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        return symbol.trim().toUpperCase(Locale.ROOT);
    }
}
