package com.ozkaslibasar.financeproject.domain.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pins the approved OQ-3 policies (decision of 2026-10-26, sections 2.1 and 2.2 Option A) literally, so a typo,
 * a weight drift or a changed window fails here rather than silently changing Evidence Strength.
 */
class EvidencePoliciesTest {

    private static final Duration DAYS_5 = Duration.ofDays(5);
    private static final Duration DAYS_400 = Duration.ofDays(400);

    private static Map<String, BigDecimal> weights(Object... pairs) {
        Map<String, BigDecimal> map = new java.util.HashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            map.put((String) pairs[i], new BigDecimal(String.valueOf(pairs[i + 1])));
        }
        return map;
    }

    @Test
    void versionConstantsAreTheApprovedStrings() {
        assertThat(EvidencePolicies.STOCK_V1).isEqualTo("stock-v1");
        assertThat(EvidencePolicies.ETF_V1).isEqualTo("etf-v1");
    }

    @Test
    void stockV1HasExactlyTheApprovedMandatoryFields() {
        EvidencePolicy policy = EvidencePolicies.stockV1();

        assertThat(policy.version()).isEqualTo("stock-v1");
        assertThat(policy.assetType()).isEqualTo(AssetType.STOCK);
        assertThat(policy.mandatoryFields()).containsExactlyInAnyOrder(
                "price.close", "fundamentals.revenue", "fundamentals.netIncome",
                "fundamentals.operatingCashFlow", "fundamentals.debtToEquity", "valuation.pe");
    }

    @Test
    void stockV1HasExactlyTheApprovedOptionalWeights() {
        Map<String, BigDecimal> expected = weights(
                "fundamentals.roe", 10, "fundamentals.roic", 10, "fundamentals.grossMargin", 6,
                "fundamentals.operatingMargin", 6, "fundamentals.netMargin", 6,
                "fundamentals.currentRatio", 6, "fundamentals.quickRatio", 4,
                "valuation.forwardPe", 8, "valuation.evEbitda", 8, "valuation.fcfYield", 7,
                "valuation.pb", 5, "valuation.ps", 4, "valuation.dividendYield", 3,
                "institutional.piotroskiFScore", 7, "institutional.altmanZScore", 5,
                "institutional.beneishMScore", 5);

        Map<String, BigDecimal> actual = EvidencePolicies.stockV1().optionalWeights();

        assertThat(actual).hasSameSizeAs(expected);
        expected.forEach((field, weight) -> assertThat(actual.get(field))
                .as("weight of %s", field).isEqualByComparingTo(weight));
    }

    @Test
    void stockV1HasExactlyTheApprovedFreshnessWindows() {
        Map<String, Duration> expected = new java.util.HashMap<>();
        for (String field : Set.of("price.close", "valuation.pe", "valuation.forwardPe", "valuation.evEbitda",
                "valuation.fcfYield", "valuation.pb", "valuation.ps", "valuation.dividendYield")) {
            expected.put(field, DAYS_5);
        }
        for (String field : Set.of("fundamentals.revenue", "fundamentals.netIncome",
                "fundamentals.operatingCashFlow", "fundamentals.debtToEquity", "fundamentals.roe",
                "fundamentals.roic", "fundamentals.grossMargin", "fundamentals.operatingMargin",
                "fundamentals.netMargin", "fundamentals.currentRatio", "fundamentals.quickRatio",
                "institutional.piotroskiFScore", "institutional.altmanZScore", "institutional.beneishMScore")) {
            expected.put(field, DAYS_400);
        }

        assertThat(EvidencePolicies.stockV1().maxAge()).isEqualTo(expected);
    }

    @Test
    void stockV1OptionalWeightsSumToExactlyOneHundredAndGroupsMatchTheApproval() {
        Map<String, BigDecimal> w = EvidencePolicies.stockV1().optionalWeights();

        assertThat(sum(w, "")).isEqualByComparingTo("100");
        assertThat(sum(w, "valuation.")).isEqualByComparingTo("35");
        assertThat(sum(w, "institutional.")).isEqualByComparingTo("17");
        assertThat(w.get("fundamentals.currentRatio").add(w.get("fundamentals.quickRatio"))).isEqualByComparingTo("10");
        assertThat(sum(w, "fundamentals.")).isEqualByComparingTo("48");
    }

    @Test
    void etfV1IsOptionAWithExactlyTheApprovedFieldsWeightsAndWindows() {
        EvidencePolicy policy = EvidencePolicies.etfV1();

        assertThat(policy.version()).isEqualTo("etf-v1");
        assertThat(policy.assetType()).isEqualTo(AssetType.ETF);
        assertThat(policy.mandatoryFields()).containsExactly("price.close");
        Map<String, BigDecimal> expected = weights("fund.expenseRatio", 25, "fund.holdings", 20,
                "fund.assets", 15, "fund.navPremium", 15, "price.volume", 15, "fund.dividendYield", 10);
        assertThat(policy.optionalWeights()).hasSameSizeAs(expected);
        expected.forEach((field, weight) -> assertThat(policy.optionalWeights().get(field))
                .as("weight of %s", field).isEqualByComparingTo(weight));
        assertThat(sum(policy.optionalWeights(), "")).isEqualByComparingTo("100");
        assertThat(policy.maxAge()).isEqualTo(Map.of(
                "price.close", DAYS_5, "price.volume", DAYS_5,
                "fund.expenseRatio", DAYS_400, "fund.holdings", DAYS_400, "fund.assets", DAYS_400,
                "fund.navPremium", DAYS_400, "fund.dividendYield", DAYS_400));
    }

    @Test
    void lookupByAssetTypeAndVersion() {
        assertThat(EvidencePolicies.forAssetType(AssetType.STOCK)).contains(EvidencePolicies.stockV1());
        assertThat(EvidencePolicies.forAssetType(AssetType.ETF)).contains(EvidencePolicies.etfV1());
        assertThat(EvidencePolicies.forAssetType(AssetType.UNRESOLVED)).isEmpty();
        assertThat(EvidencePolicies.byVersion("stock-v1")).contains(EvidencePolicies.stockV1());
        assertThat(EvidencePolicies.byVersion("etf-v1")).contains(EvidencePolicies.etfV1());
        assertThat(EvidencePolicies.byVersion("stock-v2")).isEmpty();
        assertThat(EvidencePolicies.byVersion(null)).isEmpty();
    }

    private static BigDecimal sum(Map<String, BigDecimal> weights, String prefix) {
        return weights.entrySet().stream()
                .filter(e -> e.getKey().startsWith(prefix))
                .map(Map.Entry::getValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
