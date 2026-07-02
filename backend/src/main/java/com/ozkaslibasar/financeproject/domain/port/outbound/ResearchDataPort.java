package com.ozkaslibasar.financeproject.domain.port.outbound;

import java.util.List;
import java.util.Optional;

public interface ResearchDataPort {

    Optional<FundamentalResearch> fetchFundamental(String symbol);

    List<EarningsQuarter> fetchEarnings(String symbol);

    Optional<InstitutionalScores> fetchInstitutionalScores(String symbol);

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
