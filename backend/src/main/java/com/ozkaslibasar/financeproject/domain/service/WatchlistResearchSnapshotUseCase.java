package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.Watchlist;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchSnapshot;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.WatchlistPort;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

public class WatchlistResearchSnapshotUseCase {

    private static final int DEFAULT_LIMIT = 25;
    private static final int MAX_LIMIT = 50;
    private static final int PROVIDER_CONCURRENCY_LIMIT = 4;
    private static final Duration PROVIDER_TIMEOUT = Duration.ofSeconds(4);
    private static final int CIRCUIT_FAILURE_THRESHOLD = 3;
    private static final Duration CIRCUIT_OPEN_DURATION = Duration.ofSeconds(60);

    private final WatchlistPort watchlistPort;
    private final PriceRefreshService priceRefreshService;
    private final TechnicalAnalysisPort technicalAnalysisPort;
    private final ResearchDataPort researchDataPort;
    private final Semaphore providerSemaphore = new Semaphore(PROVIDER_CONCURRENCY_LIMIT);
    private final Map<String, CircuitState> circuitStates = new ConcurrentHashMap<>();

    public WatchlistResearchSnapshotUseCase(
            WatchlistPort watchlistPort,
            PriceRefreshService priceRefreshService,
            TechnicalAnalysisPort technicalAnalysisPort,
            ResearchDataPort researchDataPort) {
        this.watchlistPort = Objects.requireNonNull(watchlistPort, "watchlistPort must not be null");
        this.priceRefreshService = Objects.requireNonNull(priceRefreshService, "priceRefreshService must not be null");
        this.technicalAnalysisPort = Objects.requireNonNull(technicalAnalysisPort, "technicalAnalysisPort must not be null");
        this.researchDataPort = Objects.requireNonNull(researchDataPort, "researchDataPort must not be null");
    }

    public WatchlistResearchSnapshot getSnapshot(
            String userId,
            Long watchlistId,
            int requestedLimit,
            int requestedOffset,
            List<String> requestedSymbols,
            boolean refresh) {
        Watchlist watchlist = watchlistPort.findByIdAndUserId(watchlistId, userId)
                .orElseThrow(() -> new NoSuchElementException("Watchlist not found: " + watchlistId));
        int limit = normalizeLimit(requestedLimit);
        int offset = Math.max(0, requestedOffset);
        List<String> filteredSymbols = filterSymbols(watchlist.symbols(), requestedSymbols);
        List<String> page = page(filteredSymbols, offset, limit);
        List<WatchlistResearchSnapshot.WatchlistResearchRow> rows = page.stream()
                .map(symbol -> toRow(symbol, refresh))
                .toList();

        return new WatchlistResearchSnapshot(
                watchlist.id(),
                watchlist.name(),
                filteredSymbols.size(),
                limit,
                offset,
                List.copyOf(filteredSymbols),
                rows,
                new WatchlistResearchSnapshot.WatchlistResearchPolicy(
                        MAX_LIMIT,
                        PROVIDER_CONCURRENCY_LIMIT,
                        (int) PROVIDER_TIMEOUT.toMillis(),
                        true,
                        true),
                Instant.now());
    }

    private WatchlistResearchSnapshot.WatchlistResearchRow toRow(String symbol, boolean refresh) {
        WatchlistResearchSnapshot.WatchlistResearchSection<WatchlistResearchSnapshot.PriceSummary> price =
                section("price", "local-store/provider-chain", () -> priceSummary(symbol));
        WatchlistResearchSnapshot.WatchlistResearchSection<WatchlistResearchSnapshot.TechnicalSummary> technical =
                section("technical", "data-service/technical", () -> technicalSummary(symbol, refresh));
        WatchlistResearchSnapshot.WatchlistResearchSection<WatchlistResearchSnapshot.FundamentalSummary> fundamentals =
                section("fundamentals", "research-provider/fundamentals", () -> fundamentalSummary(symbol, refresh));
        WatchlistResearchSnapshot.WatchlistResearchSection<WatchlistResearchSnapshot.EarningsSummary> earnings =
                section("earnings", "research-provider/earnings", () -> earningsSummary(symbol, refresh));
        WatchlistResearchSnapshot.WatchlistResearchSection<WatchlistResearchSnapshot.InstitutionalSummary> institutional =
                section("institutional", "research-provider/institutional", () -> institutionalSummary(symbol, refresh));

        return new WatchlistResearchSnapshot.WatchlistResearchRow(
                symbol,
                price,
                technical,
                fundamentals,
                earnings,
                institutional,
                overallStatus(List.of(price.status(), technical.status(), fundamentals.status(), earnings.status(), institutional.status())));
    }

    private Optional<WatchlistResearchSnapshot.PriceSummary> priceSummary(String symbol) {
        return priceRefreshService.getFreshLatest(symbol)
                .map(price -> new WatchlistResearchSnapshot.PriceSummary(
                        price.close(),
                        price.open(),
                        price.high(),
                        price.low(),
                        price.volume(),
                        price.timestampAsInstant()));
    }

    private Optional<WatchlistResearchSnapshot.TechnicalSummary> technicalSummary(String symbol, boolean refresh) {
        String range = refresh ? "6mo" : "3mo";
        return technicalAnalysisPort.fetchTechnicalAnalysis(symbol, "1d", range)
                .map(WatchlistResearchSnapshot.TechnicalSummary::from);
    }

    private Optional<WatchlistResearchSnapshot.FundamentalSummary> fundamentalSummary(String symbol, boolean refresh) {
        return researchDataPort.fetchFundamental(symbol)
                .map(WatchlistResearchSnapshot.FundamentalSummary::from);
    }

    private Optional<WatchlistResearchSnapshot.EarningsSummary> earningsSummary(String symbol, boolean refresh) {
        List<ResearchDataPort.EarningsQuarter> quarters = researchDataPort.fetchEarnings(symbol);
        if (quarters == null || quarters.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new WatchlistResearchSnapshot.EarningsSummary(List.copyOf(quarters)));
    }

    private Optional<WatchlistResearchSnapshot.InstitutionalSummary> institutionalSummary(String symbol, boolean refresh) {
        return researchDataPort.fetchInstitutionalScores(symbol)
                .map(WatchlistResearchSnapshot.InstitutionalSummary::from);
    }

    private <T> WatchlistResearchSnapshot.WatchlistResearchSection<T> section(
            String circuitKey,
            String source,
            Supplier<Optional<T>> supplier) {
        Instant now = Instant.now();
        if (isCircuitOpen(circuitKey, now)) {
            return WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                    WatchlistResearchStatus.STALE,
                    source,
                    "Provider temporarily disabled after repeated failures",
                    now);
        }

        CompletableFuture<WatchlistResearchSnapshot.WatchlistResearchSection<T>> future = CompletableFuture.supplyAsync(() -> {
            boolean acquired = false;
            try {
                acquired = providerSemaphore.tryAcquire(PROVIDER_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
                if (!acquired) {
                    recordFailure(circuitKey, Instant.now());
                    return WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                            WatchlistResearchStatus.RATE_LIMITED,
                            source,
                            "Provider concurrency queue timed out",
                            Instant.now());
                }
                Optional<T> data = supplier.get();
                recordSuccess(circuitKey);
                return data
                        .map(value -> WatchlistResearchSnapshot.WatchlistResearchSection.ok(source, value, Instant.now()))
                        .orElseGet(() -> WatchlistResearchSnapshot.WatchlistResearchSection.empty(source, "No data returned by provider", Instant.now()));
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                recordFailure(circuitKey, Instant.now());
                return WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                        WatchlistResearchStatus.FAILED,
                        source,
                        "Provider call interrupted",
                        Instant.now());
            } catch (RuntimeException ex) {
                recordFailure(circuitKey, Instant.now());
                return WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                        statusFor(ex),
                        source,
                        safeMessage(ex),
                        Instant.now());
            } finally {
                if (acquired) {
                    providerSemaphore.release();
                }
            }
        });

        try {
            return future.get(PROVIDER_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            recordFailure(circuitKey, Instant.now());
            return WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                    WatchlistResearchStatus.FAILED,
                    source,
                    "Provider call interrupted",
                    Instant.now());
        } catch (TimeoutException ex) {
            future.cancel(true);
            recordFailure(circuitKey, Instant.now());
            return WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                    WatchlistResearchStatus.FAILED,
                    source,
                    "Provider call timed out",
                    Instant.now());
        } catch (ExecutionException ex) {
            recordFailure(circuitKey, Instant.now());
            Throwable cause = ex.getCause() == null ? ex : ex.getCause();
            return WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                    statusFor(cause),
                    source,
                    safeMessage(cause),
                    Instant.now());
        }
    }

    private boolean isCircuitOpen(String key, Instant now) {
        CircuitState state = circuitStates.get(key);
        return state != null && state.openUntil != null && state.openUntil.isAfter(now);
    }

    private void recordSuccess(String key) {
        circuitStates.remove(key);
    }

    private void recordFailure(String key, Instant now) {
        circuitStates.compute(key, (ignored, current) -> {
            int failures = current == null ? 1 : current.failures + 1;
            Instant openUntil = failures >= CIRCUIT_FAILURE_THRESHOLD ? now.plus(CIRCUIT_OPEN_DURATION) : null;
            return new CircuitState(failures, openUntil);
        });
    }

    private WatchlistResearchStatus statusFor(Throwable ex) {
        String message = safeMessage(ex).toLowerCase(Locale.ROOT);
        if (message.contains("429") || message.contains("rate limit") || message.contains("too many requests")) {
            return WatchlistResearchStatus.RATE_LIMITED;
        }
        if (message.contains("422") || message.contains("insufficient") || message.contains("candle")) {
            return WatchlistResearchStatus.INSUFFICIENT_DATA;
        }
        return WatchlistResearchStatus.FAILED;
    }

    private String safeMessage(Throwable ex) {
        if (ex == null || ex.getMessage() == null || ex.getMessage().isBlank()) {
            return "Provider request failed";
        }
        return ex.getMessage();
    }

    private WatchlistResearchStatus overallStatus(List<WatchlistResearchStatus> statuses) {
        if (statuses.stream().anyMatch(status -> status == WatchlistResearchStatus.RATE_LIMITED)) {
            return WatchlistResearchStatus.RATE_LIMITED;
        }
        if (statuses.stream().anyMatch(status -> status == WatchlistResearchStatus.FAILED)) {
            return WatchlistResearchStatus.FAILED;
        }
        if (statuses.stream().anyMatch(status -> status == WatchlistResearchStatus.INSUFFICIENT_DATA)) {
            return WatchlistResearchStatus.INSUFFICIENT_DATA;
        }
        if (statuses.stream().anyMatch(status -> status == WatchlistResearchStatus.OK)) {
            return WatchlistResearchStatus.OK;
        }
        return WatchlistResearchStatus.EMPTY;
    }

    private List<String> filterSymbols(List<String> watchlistSymbols, List<String> requestedSymbols) {
        List<String> normalizedWatchlistSymbols = watchlistSymbols == null
                ? List.of()
                : watchlistSymbols.stream()
                .filter(symbol -> symbol != null && !symbol.isBlank())
                .map(this::normalizeSymbol)
                .distinct()
                .toList();
        Set<String> requested = requestedSymbols == null || requestedSymbols.isEmpty()
                ? Set.of()
                : requestedSymbols.stream()
                .filter(symbol -> symbol != null && !symbol.isBlank())
                .map(this::normalizeSymbol)
                .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll);
        if (requested.isEmpty()) {
            return normalizedWatchlistSymbols;
        }
        return normalizedWatchlistSymbols.stream()
                .filter(requested::contains)
                .toList();
    }

    private List<String> page(List<String> symbols, int offset, int limit) {
        if (symbols.isEmpty() || offset >= symbols.size()) {
            return List.of();
        }
        int toIndex = Math.min(symbols.size(), offset + limit);
        return new ArrayList<>(symbols.subList(offset, toIndex));
    }

    private int normalizeLimit(int requestedLimit) {
        if (requestedLimit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(requestedLimit, MAX_LIMIT);
    }

    private String normalizeSymbol(String symbol) {
        return symbol.trim().toUpperCase(Locale.ROOT);
    }

    private static final class CircuitState {
        private final int failures;
        private final Instant openUntil;

        private CircuitState(int failures, Instant openUntil) {
            this.failures = failures;
            this.openUntil = openUntil;
        }
    }
}
