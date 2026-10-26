package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.ProviderFetch;

import java.util.List;
import java.util.Optional;

public interface ResearchDataPort {

    String NO_DATA_MESSAGE = "Provider returned no data";

    Optional<FundamentalResearch> fetchFundamental(String symbol);

    Optional<ValuationMetrics> fetchValuation(String symbol);

    List<EarningsQuarter> fetchEarnings(String symbol);

    Optional<InstitutionalScores> fetchInstitutionalScores(String symbol);

    /**
     * Outcome-returning variants that keep a provider failure apart from "no data". The defaults wrap the
     * Optional methods and so can only report OK or EMPTY; adapters that can see the failure override them.
     */
    default ProviderFetch<FundamentalResearch> fetchFundamentalResult(String symbol) {
        return ProviderFetch.ofOptional(fetchFundamental(symbol), NO_DATA_MESSAGE);
    }

    default ProviderFetch<List<EarningsQuarter>> fetchEarningsResult(String symbol) {
        return ProviderFetch.ofList(fetchEarnings(symbol), NO_DATA_MESSAGE);
    }

    default ProviderFetch<InstitutionalScores> fetchInstitutionalScoresResult(String symbol) {
        return ProviderFetch.ofOptional(fetchInstitutionalScores(symbol), NO_DATA_MESSAGE);
    }

    record FundamentalResearch(
            String symbol,
            FundamentalMetrics metrics,
            String fiscalYear,
            String currency,
            String calculatedAt) {
    }

    record FundamentalMetrics(
            Double roe,
            Double roa,
            Double roic,
            Double grossMargin,
            Double operatingMargin,
            Double netMargin,
            Double currentRatio,
            Double quickRatio,
            Double debtToEquity,
            Double revenue,
            Double netIncome,
            Double operatingCashFlow) {
    }

    record ValuationMetrics(
            Double pe,
            Double forwardPe,
            Double peg,
            Double pb,
            Double ps,
            Double evEbitda,
            Double dividendYield,
            Double fcfYield) {
    }
    record EarningsQuarter(
            String period,
            Double actual,
            Double estimate,
            Double surprise,
            Double surprisePct,
            Boolean beat) {
    }

    record InstitutionalScores(
            Integer piotroskiFScore,
            Double altmanZScore,
            Double beneishMScore,
            Integer qualityComposite,
            String economicMoat,
            Integer earningsQuality) {
    }
}
