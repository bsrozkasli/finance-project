package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.PriceLookup;
import com.ozkaslibasar.financeproject.domain.model.ProviderFetch;
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

    private static final String FAILED_MESSAGE = "Provider request failed";
    private static final String PRICE_SOURCE = "local-store/provider-chain";
    private static final String PRICE_STALE_REFRESH_FAILED_MESSAGE =
            "Provider refresh failed; showing the last stored price";
    private static final String PRICE_STALE_REFRESH_EMPTY_MESSAGE =
            "Provider returned no newer price; showing the last stored price";
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
                guardedSection(null, PRICE_SOURCE, () -> priceSection(symbol));
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

    /**
     * The price section follows how the lookup obtained the price: only a price confirmed by a provider
     * refresh is OK; a stored price after a failed or empty refresh is STALE and keeps its data; with no
     * price at all the section is FAILED or EMPTY. The section has no circuit breaker.
     */
    private WatchlistResearchSnapshot.WatchlistResearchSection<WatchlistResearchSnapshot.PriceSummary> priceSection(
            String symbol) {
        PriceLookup lookup = Objects.requireNonNull(
                priceRefreshService.lookupFreshLatest(symbol), "price lookup must not be null");
        Instant observedAt = Instant.now();
        Optional<WatchlistResearchSnapshot.PriceSummary> summary = lookup.price().map(this::toPriceSummary);
        return switch (lookup.origin()) {
            case FRESH -> WatchlistResearchSnapshot.WatchlistResearchSection.ok(PRICE_SOURCE, summary.orElseThrow(), observedAt);
            case STORED_REFRESH_FAILED -> WatchlistResearchSnapshot.WatchlistResearchSection.stale(
                    PRICE_SOURCE, summary.orElseThrow(), PRICE_STALE_REFRESH_FAILED_MESSAGE, observedAt);
            case STORED_REFRESH_EMPTY -> WatchlistResearchSnapshot.WatchlistResearchSection.stale(
                    PRICE_SOURCE, summary.orElseThrow(), PRICE_STALE_REFRESH_EMPTY_MESSAGE, observedAt);
            case NONE_REFRESH_FAILED -> WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                    WatchlistResearchStatus.FAILED, PRICE_SOURCE, FAILED_MESSAGE, observedAt);
            case NONE_REFRESH_EMPTY -> WatchlistResearchSnapshot.WatchlistResearchSection.empty(
                    PRICE_SOURCE, ProviderFetch.NO_DATA_MESSAGE, observedAt);
        };
    }

    private WatchlistResearchSnapshot.PriceSummary toPriceSummary(PriceHistory price) {
        return new WatchlistResearchSnapshot.PriceSummary(
                price.close(),
                price.open(),
                price.high(),
                price.low(),
                price.volume(),
                price.timestampAsInstant());
    }

    /**
     * Indicators and signal are two calls. Either one with data gives a summary (the other part stays null,
     * as before). With no data from either, the outcome is the more severe of the two, in the same order as
     * the overall status: RATE_LIMITED, FAILED, INSUFFICIENT_DATA, EMPTY.
     */
    private ProviderFetch<WatchlistResearchSnapshot.TechnicalSummary> technicalSummary(String symbol, boolean refresh) {
        String range = refresh ? "6mo" : "3mo";
        ProviderFetch<TechnicalAnalysisPort.TechnicalAnalysisResult> indicators =
                requireFetch(technicalAnalysisPort.fetchTechnicalAnalysisResult(symbol, "1d", range));
        ProviderFetch<TechnicalAnalysisPort.TechnicalAnalysisResult> signal =
                requireFetch(technicalAnalysisPort.fetchTechnicalSignalsResult(symbol, "1d", range));
        if (!indicators.ok() && !signal.ok()) {
            // On a tie the provider-fault one wins, so a real provider failure still counts toward the breaker.
            ProviderFetch<?> worse = severity(indicators) >= severity(signal) ? indicators : signal;
            return new ProviderFetch<>(worse.outcome(), null, worse.message(), worse.providerFault());
        }
        return ProviderFetch.ok(toTechnicalSummary(indicators.data(), signal.data()));
    }

    private WatchlistResearchSnapshot.TechnicalSummary toTechnicalSummary(
            TechnicalAnalysisPort.TechnicalAnalysisResult indicator,
            TechnicalAnalysisPort.TechnicalAnalysisResult signalResult) {
        return new WatchlistResearchSnapshot.TechnicalSummary(
                indicator == null ? null : indicator.rsi(),
                indicator == null ? null : indicator.macd(),
                indicator == null ? null : indicator.macdSignal(),
                indicator == null ? null : indicator.sma(),
                indicator == null ? null : indicator.sma20(),
                indicator == null ? null : indicator.sma50(),
                indicator == null ? null : indicator.sma200(),
                indicator == null ? null : indicator.ema(),
                signalResult == null ? null : signalResult.action(),
                signalResult == null ? null : signalResult.confidence(),
                indicator != null ? indicator.timestamp() : signalResult.timestamp());
    }

    private static int severity(ProviderFetch<?> fetch) {
        int rank = switch (fetch.outcome()) {
            case RATE_LIMITED -> 4;
            case FAILED -> 3;
            case INSUFFICIENT_DATA -> 2;
            case EMPTY -> 1;
            case OK -> 0;
        };
        return rank * 2 + (fetch.providerFault() ? 1 : 0);
    }

    private ProviderFetch<WatchlistResearchSnapshot.FundamentalSummary> fundamentalSummary(String symbol, boolean refresh) {
        return requireFetch(researchDataPort.fetchFundamentalResult(symbol))
                .map(WatchlistResearchSnapshot.FundamentalSummary::from);
    }

    private ProviderFetch<WatchlistResearchSnapshot.EarningsSummary> earningsSummary(String symbol, boolean refresh) {
        return requireFetch(researchDataPort.fetchEarningsResult(symbol))
                .map(quarters -> new WatchlistResearchSnapshot.EarningsSummary(List.copyOf(quarters)));
    }

    private ProviderFetch<WatchlistResearchSnapshot.InstitutionalSummary> institutionalSummary(String symbol, boolean refresh) {
        return requireFetch(researchDataPort.fetchInstitutionalScoresResult(symbol))
                .map(WatchlistResearchSnapshot.InstitutionalSummary::from);
    }

    /** A port that returns null breaks its contract; report it as a failed call, never as data or as empty. */
    private static <T> ProviderFetch<T> requireFetch(ProviderFetch<T> fetch) {
        return fetch != null ? fetch : ProviderFetch.failed(FAILED_MESSAGE); // a broken port is a provider-side fault
    }

    /**
     * Runs one provider call and turns its outcome into a section. FAILED and RATE_LIMITED count as breaker
     * failures; OK, EMPTY and INSUFFICIENT_DATA are valid answers and count as successes. Exceptions that
     * still escape (price path, interrupts, timeouts) keep the message-based {@link #statusFor}.
     */
    private <T> WatchlistResearchSnapshot.WatchlistResearchSection<T> section(
            String circuitKey,
            String source,
            Supplier<ProviderFetch<T>> supplier) {
        return guardedSection(circuitKey, source,
                () -> toSection(circuitKey, source, requireFetch(supplier.get())));
    }

    /**
     * Same concurrency limit and timeout as {@link #section}; a {@code null} circuit key means the section
     * has no circuit breaker (the price section), so nothing is read from or written to the breaker state.
     */
    private <T> WatchlistResearchSnapshot.WatchlistResearchSection<T> guardedSection(
            String circuitKey,
            String source,
            Supplier<WatchlistResearchSnapshot.WatchlistResearchSection<T>> sectionSupplier) {
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
                return sectionSupplier.get();
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

    private <T> WatchlistResearchSnapshot.WatchlistResearchSection<T> toSection(
            String circuitKey, String source, ProviderFetch<T> fetch) {
        Instant observedAt = Instant.now();
        switch (fetch.outcome()) {
            case OK:
                recordSuccess(circuitKey);
                return WatchlistResearchSnapshot.WatchlistResearchSection.ok(source, fetch.data(), observedAt);
            case EMPTY:
                recordSuccess(circuitKey);
                return WatchlistResearchSnapshot.WatchlistResearchSection.empty(source, fetch.message(), observedAt);
            case INSUFFICIENT_DATA:
                recordSuccess(circuitKey);
                return WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                        WatchlistResearchStatus.INSUFFICIENT_DATA, source, fetch.message(), observedAt);
            case RATE_LIMITED:
                recordFailure(circuitKey, observedAt);
                return WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                        WatchlistResearchStatus.RATE_LIMITED, source, fetch.message(), observedAt);
            case FAILED:
            default:
                // A client error (4xx other than 429) about one request must not trip a breaker shared by all
                // symbols: it keeps the FAILED status but leaves the failure count untouched.
                if (fetch.providerFault()) {
                    recordFailure(circuitKey, observedAt);
                }
                return WatchlistResearchSnapshot.WatchlistResearchSection.failed(
                        WatchlistResearchStatus.FAILED, source, fetch.message(), observedAt);
        }
    }

    private boolean isCircuitOpen(String key, Instant now) {
        if (key == null) {
            return false;
        }
        CircuitState state = circuitStates.get(key);
        return state != null && state.openUntil != null && state.openUntil.isAfter(now);
    }

    private void recordSuccess(String key) {
        if (key != null) {
            circuitStates.remove(key);
        }
    }

    private void recordFailure(String key, Instant now) {
        if (key == null) {
            return;
        }
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
        if (statuses.stream().anyMatch(status -> status == WatchlistResearchStatus.STALE)) {
            return WatchlistResearchStatus.STALE;
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
