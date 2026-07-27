package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;

public record AssetResearchDetail(
        String symbol,
        Section<Profile> profile,
        Section<Market> market,
        Instant generatedAt) {

    public record Section<T>(String status, String source, T data, String message, Instant observedAt) {
        public static <T> Section<T> ok(String source, T data, Instant observedAt) {
            return new Section<>("OK", source, data, null, observedAt);
        }

        public static <T> Section<T> empty(String source, String message, Instant observedAt) {
            return new Section<>("EMPTY", source, null, message, observedAt);
        }

        public static <T> Section<T> failed(String source, String message, Instant observedAt) {
            return new Section<>("FAILED", source, null, message, observedAt);
        }
    }

    public record Profile(
            String symbol, String name, String exchange, String currency, String sector,
            String industry, Long marketCap, String description, String website,
            String logoUrl, String country, String quoteType, Integer fullTimeEmployees) {
    }

    public record Market(
            String symbol, String marketState, String exchangeTimezone, Double previousClose,
            Double regularPrice, Double regularChange, Double regularChangePercent, Instant regularTimestamp,
            Double preMarketPrice, Double preMarketChange, Double preMarketChangePercent, Instant preMarketTimestamp,
            Double postMarketPrice, Double postMarketChange, Double postMarketChangePercent, Instant postMarketTimestamp,
            Boolean delayed) {
    }
}