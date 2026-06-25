package com.ozkaslibasar.financeproject.domain.model;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BacktestResult {
    private final String symbol;
    private final Double currentRsi;
    private final String scenarioDescription;
    private final Integer totalOccurrences;
    private final Double winRate;
    private final Double averageReturnPct;
    private final Boolean isMeaningful;
}
