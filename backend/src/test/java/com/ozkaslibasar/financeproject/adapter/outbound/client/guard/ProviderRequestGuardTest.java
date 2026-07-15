package com.ozkaslibasar.financeproject.adapter.outbound.client.guard;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class ProviderRequestGuardTest {

    @Test
    void returnsDegradedResultWhenMinuteQuotaIsExceeded() {
        ProviderRequestGuard guard = new ProviderRequestGuard(
                Clock.fixed(Instant.parse("2026-07-09T10:00:00Z"), ZoneOffset.UTC),
                10,
                1,
                Duration.ofSeconds(30));
        AtomicInteger calls = new AtomicInteger();

        String first = guard.execute("YAHOO", "asset_info", "MSFT", MarketDataPriority.VISIBLE, () -> {
            calls.incrementAndGet();
            return "ok";
        }, "degraded");
        String second = guard.execute("YAHOO", "asset_info", "AAPL", MarketDataPriority.VISIBLE, () -> {
            calls.incrementAndGet();
            return "ok";
        }, "degraded");

        assertThat(first).isEqualTo("ok");
        assertThat(second).isEqualTo("degraded");
        assertThat(calls).hasValue(1);
        assertThat(guard.snapshot("YAHOO").minuteCount()).isEqualTo(1);
    }

    @Test
    void rateLimitResponseStartsBackoffAndBlocksNextRequest() {
        ProviderRequestGuard guard = new ProviderRequestGuard(
                Clock.fixed(Instant.parse("2026-07-09T10:00:00Z"), ZoneOffset.UTC),
                10,
                10,
                Duration.ofSeconds(30));
        AtomicInteger calls = new AtomicInteger();

        String first = guard.execute("YAHOO", "price_history", "DRAM", MarketDataPriority.WATCHLIST, () -> {
            calls.incrementAndGet();
            throw new HttpClientErrorException(HttpStatus.TOO_MANY_REQUESTS);
        }, "empty");
        String second = guard.execute("YAHOO", "price_history", "DRAM", MarketDataPriority.WATCHLIST, () -> {
            calls.incrementAndGet();
            return "ok";
        }, "empty");

        assertThat(first).isEqualTo("empty");
        assertThat(second).isEqualTo("empty");
        assertThat(calls).hasValue(1);
        assertThat(guard.snapshot("YAHOO").rateLimitCount()).isEqualTo(1);
        assertThat(guard.snapshot("YAHOO").backoffUntil()).isAfter(Instant.parse("2026-07-09T10:00:00Z"));
    }
}
