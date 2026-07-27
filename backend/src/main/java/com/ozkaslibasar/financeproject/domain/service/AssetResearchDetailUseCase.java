package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AssetMarketBatch;
import com.ozkaslibasar.financeproject.domain.model.AssetProfileBatch;
import com.ozkaslibasar.financeproject.domain.model.AssetResearchDetail;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetDetailDataPort;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

public class AssetResearchDetailUseCase {

    private final AssetDetailDataPort dataPort;

    public AssetResearchDetailUseCase(AssetDetailDataPort dataPort) {
        this.dataPort = dataPort;
    }

    public AssetResearchDetail getDetail(String rawSymbol) {
        String symbol = rawSymbol.trim().toUpperCase(Locale.ROOT);
        return new AssetResearchDetail(symbol, profile(symbol), market(symbol), Instant.now());
    }

    public AssetMarketBatch getMarketBatch(List<String> rawSymbols) {
        Map<String, AssetResearchDetail.Section<AssetResearchDetail.Market>> quotes = new LinkedHashMap<>();
        normalizeSymbols(rawSymbols).forEach(symbol -> quotes.put(symbol, market(symbol)));
        return new AssetMarketBatch(Map.copyOf(quotes), Instant.now());
    }

    public AssetProfileBatch getProfileBatch(List<String> rawSymbols) {
        Map<String, AssetResearchDetail.Section<AssetResearchDetail.Profile>> profiles = new LinkedHashMap<>();
        normalizeSymbols(rawSymbols).forEach(symbol -> profiles.put(symbol, profile(symbol)));
        return new AssetProfileBatch(Map.copyOf(profiles), Instant.now());
    }

    private List<String> normalizeSymbols(List<String> rawSymbols) {
        if (rawSymbols == null || rawSymbols.isEmpty()) {
            return List.of();
        }
        return rawSymbols.stream()
                .filter(symbol -> symbol != null && !symbol.isBlank())
                .map(symbol -> symbol.trim().toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    private AssetResearchDetail.Section<AssetResearchDetail.Profile> profile(String symbol) {
        Instant now = Instant.now();
        try {
            Optional<AssetDetailDataPort.CompanyProfile> profile = dataPort.fetchProfile(symbol);
            return profile.map(value -> AssetResearchDetail.Section.ok(value.source(), new AssetResearchDetail.Profile(
                    value.symbol(), value.name(), value.exchange(), value.currency(), value.sector(), value.industry(),
                    value.marketCap(), value.description(), value.website(), value.logoUrl(), value.country(),
                    value.quoteType(), value.fullTimeEmployees()), now)).orElseGet(() ->
                    AssetResearchDetail.Section.empty("provider-chain", "Company profile is unavailable.", now));
        } catch (RuntimeException ex) {
            return AssetResearchDetail.Section.failed("provider-chain", safeMessage(ex), now);
        }
    }

    private AssetResearchDetail.Section<AssetResearchDetail.Market> market(String symbol) {
        Instant now = Instant.now();
        try {
            Optional<AssetDetailDataPort.MarketQuote> quote = dataPort.fetchMarketQuote(symbol);
            return quote.map(value -> AssetResearchDetail.Section.ok(value.source(), new AssetResearchDetail.Market(
                    value.symbol(), value.marketState(), value.exchangeTimezone(), value.previousClose(),
                    value.regularPrice(), value.regularChange(), value.regularChangePercent(), value.regularTimestamp(),
                    value.preMarketPrice(), value.preMarketChange(), value.preMarketChangePercent(), value.preMarketTimestamp(),
                    value.postMarketPrice(), value.postMarketChange(), value.postMarketChangePercent(), value.postMarketTimestamp(),
                    value.delayed()), now)).orElseGet(() ->
                    AssetResearchDetail.Section.empty("provider-chain", "Market quote is unavailable.", now));
        } catch (RuntimeException ex) {
            return AssetResearchDetail.Section.failed("provider-chain", safeMessage(ex), now);
        }
    }

    private String safeMessage(RuntimeException ex) {
        return ex.getMessage() == null || ex.getMessage().isBlank() ? "Provider request failed." : ex.getMessage();
    }
}