package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.FinancialHistorySnapshot;

/** Outbound port for raw multi-year annual financials. */
public interface FinancialHistoryPort {

    /** Provider failure is returned as UNAVAILABLE with empty years, never thrown. */
    FinancialHistorySnapshot fetchHistory(String symbol);
}
