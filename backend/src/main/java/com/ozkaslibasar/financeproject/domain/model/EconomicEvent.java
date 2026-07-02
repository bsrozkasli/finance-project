package com.ozkaslibasar.financeproject.domain.model;

/** High-impact macro calendar event from FMP. */
public record EconomicEvent(
        String event,
        String date,
        String country,
        String impact,
        Object actual,
        Object estimate,
        Object previous
) {
}