package com.ozkaslibasar.financeproject.domain.port.outbound;

import java.time.Instant;
import java.util.Optional;

public interface AssetDetailDataPort {

    Optional<CompanyProfile> fetchProfile(String symbol);

    Optional<MarketQuote> fetchMarketQuote(String symbol);

    record CompanyProfile(
            String symbol, String name, String exchange, String currency, String sector,
            String industry, Long marketCap, String description, String website,
            String logoUrl, String country, String quoteType, Integer fullTimeEmployees,
            String source) {
    }

    record MarketQuote(
            String symbol, String marketState, String exchangeTimezone, Double previousClose,
            Double regularPrice, Double regularChange, Double regularChangePercent, Instant regularTimestamp,
            Double preMarketPrice, Double preMarketChange, Double preMarketChangePercent, Instant preMarketTimestamp,
            Double postMarketPrice, Double postMarketChange, Double postMarketChangePercent, Instant postMarketTimestamp,
            Boolean delayed, String source) {
    }
}