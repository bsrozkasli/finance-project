package com.ozkaslibasar.financeproject.domain.port.outbound;

import java.util.List;
import java.util.Optional;

/**
 * Outbound port for company metrics and peer symbols used by smart reports.
 */
public interface SmartReportMarketDataPort {

    Optional<CompanyMetrics> fetchCompanyMetrics(String symbol);

    List<String> fetchPeers(String symbol);

    record CompanyMetrics(
            Double peRatio,
            Double pbRatio,
            Double debtToEquity,
            Double netProfitMargin,
            Double roe) {
    }
}
