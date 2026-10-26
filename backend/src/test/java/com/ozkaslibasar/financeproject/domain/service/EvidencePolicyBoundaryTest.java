package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.ClassificationBasis;
import com.ozkaslibasar.financeproject.domain.model.EvidenceFreshness;
import com.ozkaslibasar.financeproject.domain.model.EvidenceGap;
import com.ozkaslibasar.financeproject.domain.model.EvidenceGapReason;
import com.ozkaslibasar.financeproject.domain.model.EvidencePolicies;
import com.ozkaslibasar.financeproject.domain.model.EvidenceStrength;
import com.ozkaslibasar.financeproject.domain.model.EvidenceStrengthResult;
import com.ozkaslibasar.financeproject.domain.model.InstrumentIdentity;
import com.ozkaslibasar.financeproject.domain.model.ListingStatus;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceField;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs the REAL engine with the REAL approved policies over the boundary cases of the decision of 2026-10-26
 * (section 2.3). Expected levels are copied from that table, never recomputed from the policy. Field names and
 * the missing-weight arithmetic in the comments come from the approved text.
 */
class EvidencePolicyBoundaryTest {

    private static final Instant EVAL = Instant.parse("2026-10-24T00:00:00Z");
    private static final Instant CAPTURED = EVAL.plus(Duration.ofHours(1));
    private static final Instant FRESH = EVAL.minus(Duration.ofDays(1));

    private static final List<String> STOCK_MANDATORY = List.of("price.close", "fundamentals.revenue",
            "fundamentals.netIncome", "fundamentals.operatingCashFlow", "fundamentals.debtToEquity", "valuation.pe");
    private static final List<String> STOCK_OPTIONAL = List.of(
            "fundamentals.roe", "fundamentals.roic", "fundamentals.grossMargin", "fundamentals.operatingMargin",
            "fundamentals.netMargin", "fundamentals.currentRatio", "fundamentals.quickRatio",
            "valuation.forwardPe", "valuation.evEbitda", "valuation.fcfYield", "valuation.pb", "valuation.ps",
            "valuation.dividendYield",
            "institutional.piotroskiFScore", "institutional.altmanZScore", "institutional.beneishMScore");

    private final EvidenceStrengthService service = new EvidenceStrengthService();

    private static ResearchEvidenceField field(String name, String value, String source, Instant observedAt) {
        return new ResearchEvidenceField(name, value, null, source, observedAt, CAPTURED, "TTM", "USD", "v1",
                EvidenceFreshness.FRESH, null);
    }

    private static ResearchEvidenceField fresh(String name) {
        return field(name, "1", "fixture", FRESH);
    }

    private static ResearchEvidenceSnapshot snapshot(AssetType type, List<ResearchEvidenceField> fields) {
        InstrumentIdentity identity = new InstrumentIdentity("AAPL", type, ListingStatus.UNKNOWN,
                ClassificationBasis.CURRENT_OBSERVATION, "fixture", EVAL);
        return new ResearchEvidenceSnapshot(UUID.randomUUID(), null, 1, identity, CAPTURED, fields);
    }

    /** Every mandatory and optional stock field fresh, minus the named ones, plus extra entries. */
    private ResearchEvidenceSnapshot stock(Set<String> omit, ResearchEvidenceField... extra) {
        List<ResearchEvidenceField> fields = new ArrayList<>();
        for (String name : STOCK_MANDATORY) {
            fields.add(fresh(name));
        }
        for (String name : STOCK_OPTIONAL) {
            fields.add(fresh(name));
        }
        fields.removeIf(f -> omit.contains(f.name()));
        fields.addAll(List.of(extra));
        return snapshot(AssetType.STOCK, fields);
    }

    private EvidenceStrengthResult stockResult(ResearchEvidenceSnapshot snapshot) {
        return service.evaluate(snapshot, EvidencePolicies.stockV1(), EVAL);
    }

    private EvidenceStrength stockLevel(String... omit) {
        return stockResult(stock(Set.of(omit))).level();
    }

    // ---- coverage boundaries (missing weight / coverage / expected) ---------------------------------------------

    @Test
    void allOptionalPresentIsHigh() {
        assertThat(stockLevel()).isEqualTo(EvidenceStrength.HIGH);
    }

    @Test
    void missingRoeIsNinetyPercentAndHigh() {
        assertThat(stockLevel("fundamentals.roe")).isEqualTo(EvidenceStrength.HIGH);
    }

    @Test
    void missingRoeAndDividendYieldIsEightySevenAndMedium() {
        assertThat(stockLevel("fundamentals.roe", "valuation.dividendYield")).isEqualTo(EvidenceStrength.MEDIUM);
    }

    @Test
    void missingForwardPeFcfYieldAndRoeIsExactlySeventyFiveAndMedium() {
        assertThat(stockLevel("valuation.forwardPe", "valuation.fcfYield", "fundamentals.roe"))
                .isEqualTo(EvidenceStrength.MEDIUM);
    }

    @Test
    void missingRoeRoicAndGrossMarginIsSeventyFourAndLow() {
        assertThat(stockLevel("fundamentals.roe", "fundamentals.roic", "fundamentals.grossMargin"))
                .isEqualTo(EvidenceStrength.LOW);
    }

    @Test
    void missingTheWholeValuationGroupIsSixtyFiveAndLow() {
        assertThat(stockLevel("valuation.forwardPe", "valuation.evEbitda", "valuation.fcfYield", "valuation.pb",
                "valuation.ps", "valuation.dividendYield")).isEqualTo(EvidenceStrength.LOW);
    }

    @Test
    void missingTheWholeQualityScoresGroupIsEightyThreeAndMedium() {
        assertThat(stockLevel("institutional.piotroskiFScore", "institutional.altmanZScore",
                "institutional.beneishMScore")).isEqualTo(EvidenceStrength.MEDIUM);
    }

    // ---- mandatory hard gates -----------------------------------------------------------------------------------

    @Test
    void priceCloseExactlyFiveDaysOldIsCurrent() {
        EvidenceStrengthResult result = stockResult(stock(Set.of("price.close"),
                field("price.close", "1", "fixture", EVAL.minus(Duration.ofDays(5)))));

        assertThat(result.level()).isEqualTo(EvidenceStrength.HIGH);
        assertThat(result.gaps()).isEmpty();
    }

    @Test
    void priceCloseFiveDaysAndOneSecondOldIsInsufficient() {
        EvidenceStrengthResult result = stockResult(stock(Set.of("price.close"),
                field("price.close", "1", "fixture", EVAL.minus(Duration.ofDays(5)).minusSeconds(1))));

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("price.close", EvidenceGapReason.STALE));
    }

    @Test
    void missingNetIncomeIsInsufficient() {
        EvidenceStrengthResult result = stockResult(stock(Set.of("fundamentals.netIncome")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("fundamentals.netIncome", EvidenceGapReason.MISSING));
    }

    @Test
    void revenueFourHundredAndOneDaysOldIsInsufficient() {
        EvidenceStrengthResult result = stockResult(stock(Set.of("fundamentals.revenue"),
                field("fundamentals.revenue", "1", "fixture", EVAL.minus(Duration.ofDays(401)))));

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("fundamentals.revenue", EvidenceGapReason.STALE));
    }

    @Test
    void twoSourcesDisagreeingOnPriceCloseIsInsufficient() {
        EvidenceStrengthResult result = stockResult(stock(Set.of(),
                field("price.close", "1.05", "other-fixture", FRESH)));

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("price.close", EvidenceGapReason.CONFLICTED));
    }

    @Test
    void anUnresolvedInstrumentTypeIsInsufficient() {
        List<ResearchEvidenceField> fields = new ArrayList<>();
        STOCK_MANDATORY.forEach(n -> fields.add(fresh(n)));
        STOCK_OPTIONAL.forEach(n -> fields.add(fresh(n)));

        EvidenceStrengthResult result = service.evaluate(snapshot(AssetType.UNRESOLVED, fields),
                EvidencePolicies.stockV1(), EVAL);

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("instrument.type", EvidenceGapReason.UNRESOLVED_TYPE));
    }

    // ---- ETF Option A -------------------------------------------------------------------------------------------

    private EvidenceStrengthResult etf(String... names) {
        List<ResearchEvidenceField> fields = new ArrayList<>();
        for (String name : names) {
            fields.add(fresh(name));
        }
        // an unrelated field keeps the snapshot non-empty when no price is supplied
        fields.add(fresh("news.sentiment"));
        return service.evaluate(snapshot(AssetType.ETF, fields), EvidencePolicies.etfV1(), EVAL);
    }

    @Test
    void etfWithOnlyPriceIsLowAndNamesTheMissingFundFields() {
        EvidenceStrengthResult result = etf("price.close");

        assertThat(result.level()).isEqualTo(EvidenceStrength.LOW);
        assertThat(result.weightedCoverage()).isEqualByComparingTo("0");
        assertThat(result.gaps()).containsExactly(
                new EvidenceGap("fund.assets", EvidenceGapReason.MISSING),
                new EvidenceGap("fund.dividendYield", EvidenceGapReason.MISSING),
                new EvidenceGap("fund.expenseRatio", EvidenceGapReason.MISSING),
                new EvidenceGap("fund.holdings", EvidenceGapReason.MISSING),
                new EvidenceGap("fund.navPremium", EvidenceGapReason.MISSING),
                new EvidenceGap("price.volume", EvidenceGapReason.MISSING));
    }

    @Test
    void etfWithPriceVolumeAndDividendYieldIsLowAtTwentyFivePercent() {
        EvidenceStrengthResult result = etf("price.close", "price.volume", "fund.dividendYield");

        assertThat(result.level()).isEqualTo(EvidenceStrength.LOW);
        assertThat(result.weightedCoverage()).isEqualByComparingTo("0.25");
        assertThat(result.policyVersion()).isEqualTo("etf-v1");
    }

    @Test
    void etfWithoutPriceIsInsufficient() {
        EvidenceStrengthResult result = etf("price.volume", "fund.dividendYield");

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).contains(new EvidenceGap("price.close", EvidenceGapReason.MISSING));
    }

    @Test
    void etfWithEveryFieldIsHigh() {
        assertThat(etf("price.close", "fund.expenseRatio", "fund.holdings", "fund.assets", "fund.navPremium",
                "price.volume", "fund.dividendYield").level()).isEqualTo(EvidenceStrength.HIGH);
    }
}
