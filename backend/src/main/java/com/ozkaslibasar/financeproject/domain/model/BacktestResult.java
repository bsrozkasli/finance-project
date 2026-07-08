package com.ozkaslibasar.financeproject.domain.model;

import lombok.Builder;

@Builder
public class BacktestResult {
    private final String symbol;
    private final Double currentRsi;
    private final String scenarioDescription;
    private final Integer totalOccurrences;
    private final Double winRate;
    private final Double averageReturnPct;
    private final Boolean isMeaningful;

    public String getSymbol() {
        return symbol;
    }

    public Double getCurrentRsi() {
        return currentRsi;
    }

    public String getScenarioDescription() {
        return scenarioDescription;
    }

    public Integer getTotalOccurrences() {
        return totalOccurrences;
    }

    public Double getWinRate() {
        return winRate;
    }

    public Double getAverageReturnPct() {
        return averageReturnPct;
    }

    public Boolean getIsMeaningful() {
        return isMeaningful;
    }

    public Boolean getMeaningful() {
        return isMeaningful;
    }
}
