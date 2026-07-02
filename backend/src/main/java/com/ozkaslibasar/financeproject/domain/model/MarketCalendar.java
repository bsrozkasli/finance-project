package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/** Combined earnings and high-impact economic calendar. */
public record MarketCalendar(
        List<EarningsEvent> earnings,
        List<EconomicEvent> economicEvents,
        Instant cachedAt
) {
    public MarketCalendar {
        earnings = List.copyOf(Objects.requireNonNullElse(earnings, List.of()));
        economicEvents = List.copyOf(Objects.requireNonNullElse(economicEvents, List.of()));
    }
}