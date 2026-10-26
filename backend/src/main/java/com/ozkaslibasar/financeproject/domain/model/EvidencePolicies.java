package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * The approved, versioned Evidence Strength policies (OQ-3, decision of 2026-10-26 sections 2.1 and 2.2 Option A).
 * They are immutable data for {@code EvidenceStrengthService}; changing any field, weight or window needs a new
 * approved version, not an edit of an existing one.
 *
 * <p>Nothing builds snapshots with these field names yet, so no use case consumes these policies today.
 */
public final class EvidencePolicies {

    public static final String STOCK_V1 = "stock-v1";
    public static final String ETF_V1 = "etf-v1";

    private static final Duration DAYS_5 = Duration.ofDays(5);
    private static final Duration DAYS_400 = Duration.ofDays(400);
    private static final BigDecimal TOTAL_OPTIONAL_WEIGHT = new BigDecimal("100");

    private static final EvidencePolicy STOCK = buildStock();
    private static final EvidencePolicy ETF = buildEtf();

    private EvidencePolicies() {
    }

    public static EvidencePolicy stockV1() {
        return STOCK;
    }

    public static EvidencePolicy etfV1() {
        return ETF;
    }

    /** The current approved policy for an asset type; empty for anything but STOCK and ETF. */
    public static Optional<EvidencePolicy> forAssetType(AssetType assetType) {
        if (assetType == AssetType.STOCK) {
            return Optional.of(STOCK);
        }
        if (assetType == AssetType.ETF) {
            return Optional.of(ETF);
        }
        return Optional.empty();
    }

    public static Optional<EvidencePolicy> byVersion(String version) {
        if (STOCK_V1.equals(version)) {
            return Optional.of(STOCK);
        }
        if (ETF_V1.equals(version)) {
            return Optional.of(ETF);
        }
        return Optional.empty();
    }

    private static EvidencePolicy buildStock() {
        Map<String, Duration> windows = new HashMap<>();
        for (String field : Set.of("price.close", "valuation.pe")) {
            windows.put(field, DAYS_5);
        }
        for (String field : Set.of("fundamentals.revenue", "fundamentals.netIncome",
                "fundamentals.operatingCashFlow", "fundamentals.debtToEquity")) {
            windows.put(field, DAYS_400);
        }

        Map<String, BigDecimal> optional = new LinkedHashMap<>();
        // Profitability and quality (38), balance sheet (10): annual statements.
        optional(optional, windows, DAYS_400, "fundamentals.roe", 10);
        optional(optional, windows, DAYS_400, "fundamentals.roic", 10);
        optional(optional, windows, DAYS_400, "fundamentals.grossMargin", 6);
        optional(optional, windows, DAYS_400, "fundamentals.operatingMargin", 6);
        optional(optional, windows, DAYS_400, "fundamentals.netMargin", 6);
        optional(optional, windows, DAYS_400, "fundamentals.currentRatio", 6);
        optional(optional, windows, DAYS_400, "fundamentals.quickRatio", 4);
        // Valuation (35): derived from the price, so as fresh as the price.
        optional(optional, windows, DAYS_5, "valuation.forwardPe", 8);
        optional(optional, windows, DAYS_5, "valuation.evEbitda", 8);
        optional(optional, windows, DAYS_5, "valuation.fcfYield", 7);
        optional(optional, windows, DAYS_5, "valuation.pb", 5);
        optional(optional, windows, DAYS_5, "valuation.ps", 4);
        optional(optional, windows, DAYS_5, "valuation.dividendYield", 3);
        // Quality scores (17).
        optional(optional, windows, DAYS_400, "institutional.piotroskiFScore", 7);
        optional(optional, windows, DAYS_400, "institutional.altmanZScore", 5);
        optional(optional, windows, DAYS_400, "institutional.beneishMScore", 5);

        return create(STOCK_V1, AssetType.STOCK,
                Set.of("price.close", "fundamentals.revenue", "fundamentals.netIncome",
                        "fundamentals.operatingCashFlow", "fundamentals.debtToEquity", "valuation.pe"),
                optional, windows);
    }

    private static EvidencePolicy buildEtf() {
        Map<String, Duration> windows = new HashMap<>();
        windows.put("price.close", DAYS_5);

        Map<String, BigDecimal> optional = new LinkedHashMap<>();
        optional(optional, windows, DAYS_400, "fund.expenseRatio", 25);
        optional(optional, windows, DAYS_400, "fund.holdings", 20);
        optional(optional, windows, DAYS_400, "fund.assets", 15);
        optional(optional, windows, DAYS_400, "fund.navPremium", 15);
        optional(optional, windows, DAYS_5, "price.volume", 15);
        optional(optional, windows, DAYS_400, "fund.dividendYield", 10);

        return create(ETF_V1, AssetType.ETF, Set.of("price.close"), optional, windows);
    }

    private static void optional(Map<String, BigDecimal> weights, Map<String, Duration> windows, Duration window,
                                 String field, int weight) {
        weights.put(field, BigDecimal.valueOf(weight));
        windows.put(field, window);
    }

    private static EvidencePolicy create(String version, AssetType type, Set<String> mandatory,
                                         Map<String, BigDecimal> optional, Map<String, Duration> windows) {
        BigDecimal total = optional.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(TOTAL_OPTIONAL_WEIGHT) != 0) {
            throw new IllegalStateException("optional weights of " + version + " must sum to 100, not " + total);
        }
        return new EvidencePolicy(version, type, mandatory, optional, windows);
    }
}
