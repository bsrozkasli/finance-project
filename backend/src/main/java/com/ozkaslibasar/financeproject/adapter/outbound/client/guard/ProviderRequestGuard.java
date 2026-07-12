package com.ozkaslibasar.financeproject.adapter.outbound.client.guard;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

@Component
@Slf4j
public class ProviderRequestGuard {

    private final Clock clock;
    private final int yahooDailyQuota;
    private final int yahooMinuteQuota;
    private final Duration baseBackoff;
    private final Map<String, ProviderState> states = new ConcurrentHashMap<>();
    private final Map<String, Object> locks = new ConcurrentHashMap<>();

    @Autowired
    public ProviderRequestGuard(
            @Value("${market-data.providers.yahoo.daily-quota:2000}") int yahooDailyQuota,
            @Value("${market-data.providers.yahoo.minute-quota:120}") int yahooMinuteQuota,
            @Value("${market-data.providers.yahoo.base-backoff-seconds:30}") long baseBackoffSeconds) {
        this(Clock.systemUTC(), yahooDailyQuota, yahooMinuteQuota, Duration.ofSeconds(baseBackoffSeconds));
    }

    ProviderRequestGuard(Clock clock, int yahooDailyQuota, int yahooMinuteQuota, Duration baseBackoff) {
        this.clock = clock;
        this.yahooDailyQuota = yahooDailyQuota;
        this.yahooMinuteQuota = yahooMinuteQuota;
        this.baseBackoff = baseBackoff;
    }

    public <T> T execute(
            String provider,
            String operation,
            String symbol,
            MarketDataPriority priority,
            Supplier<T> supplier,
            T degradedResult) {
        Objects.requireNonNull(supplier, "Supplier must not be null");
        String normalizedProvider = normalize(provider);
        String requestKey = normalizedProvider + ":" + normalize(operation) + ":" + normalize(symbol);
        Object lock = locks.computeIfAbsent(requestKey, ignored -> new Object());
        synchronized (lock) {
            ProviderState state = states.computeIfAbsent(normalizedProvider, ignored -> new ProviderState(clock.instant()));
            Instant now = clock.instant();
            state.rollWindows(now);

            if (!state.canRequest(now, yahooDailyQuota, yahooMinuteQuota)) {
                log.warn(
                        "operation={} provider={} symbol={} priority={} result=degraded reason=quota_or_backoff cooldown_until={}",
                        operation,
                        provider,
                        symbol,
                        priority,
                        state.backoffUntil);
                return degradedResult;
            }

            state.recordAttempt(now);
            try {
                T result = supplier.get();
                state.recordSuccess();
                return result;
            } catch (HttpClientErrorException ex) {
                if (ex.getStatusCode().value() != 429) {
                    state.recordFailure(now, baseBackoff);
                    log.warn("operation={} provider={} symbol={} result=provider_error reason={}", operation, provider, symbol, ex.getMessage());
                    return degradedResult;
                }
                state.recordRateLimit(now, baseBackoff);
                log.warn("operation={} provider={} symbol={} result=rate_limited cooldown_until={}", operation, provider, symbol, state.backoffUntil);
                return degradedResult;
            } catch (RuntimeException ex) {
                state.recordFailure(now, baseBackoff);
                log.warn("operation={} provider={} symbol={} result=provider_error reason={}", operation, provider, symbol, ex.getMessage());
                return degradedResult;
            } finally {
                locks.remove(requestKey, lock);
            }
        }
    }

    public ProviderQuotaSnapshot snapshot(String provider) {
        ProviderState state = states.computeIfAbsent(normalize(provider), ignored -> new ProviderState(clock.instant()));
        Instant now = clock.instant();
        synchronized (state) {
            state.rollWindows(now);
            return new ProviderQuotaSnapshot(
                    normalize(provider),
                    state.dailyCount,
                    yahooDailyQuota,
                    state.minuteCount,
                    yahooMinuteQuota,
                    state.backoffUntil,
                    state.consecutiveFailures,
                    state.rateLimitCount);
        }
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? "UNKNOWN" : value.trim().toUpperCase();
    }

    public record ProviderQuotaSnapshot(
            String provider,
            int dailyCount,
            int dailyQuota,
            int minuteCount,
            int minuteQuota,
            Instant backoffUntil,
            int consecutiveFailures,
            int rateLimitCount) {
    }

    private static final class ProviderState {
        private LocalDate day;
        private Instant minuteWindowStart;
        private Instant backoffUntil;
        private int dailyCount;
        private int minuteCount;
        private int consecutiveFailures;
        private int rateLimitCount;

        private ProviderState(Instant now) {
            this.day = LocalDate.ofInstant(now, Clock.systemUTC().getZone());
            this.minuteWindowStart = now;
        }

        private synchronized void rollWindows(Instant now) {
            LocalDate currentDay = LocalDate.ofInstant(now, Clock.systemUTC().getZone());
            if (!currentDay.equals(day)) {
                day = currentDay;
                dailyCount = 0;
                rateLimitCount = 0;
                consecutiveFailures = 0;
            }
            if (Duration.between(minuteWindowStart, now).compareTo(Duration.ofMinutes(1)) >= 0) {
                minuteWindowStart = now;
                minuteCount = 0;
            }
        }

        private synchronized boolean canRequest(Instant now, int dailyQuota, int minuteQuota) {
            if (backoffUntil != null && now.isBefore(backoffUntil)) {
                return false;
            }
            return dailyCount < dailyQuota && minuteCount < minuteQuota;
        }

        private synchronized void recordAttempt(Instant now) {
            rollWindows(now);
            dailyCount += 1;
            minuteCount += 1;
        }

        private synchronized void recordSuccess() {
            consecutiveFailures = 0;
            backoffUntil = null;
        }

        private synchronized void recordFailure(Instant now, Duration baseBackoff) {
            consecutiveFailures += 1;
            long multiplier = Math.min(16L, 1L << Math.min(4, consecutiveFailures - 1));
            backoffUntil = now.plus(baseBackoff.multipliedBy(multiplier));
        }

        private synchronized void recordRateLimit(Instant now, Duration baseBackoff) {
            rateLimitCount += 1;
            recordFailure(now, baseBackoff.multipliedBy(2));
        }
    }
}




