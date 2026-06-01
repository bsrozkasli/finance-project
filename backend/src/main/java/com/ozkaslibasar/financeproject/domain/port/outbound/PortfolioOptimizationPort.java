package com.ozkaslibasar.financeproject.domain.port.outbound;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface PortfolioOptimizationPort {

    Optional<OptimizationResult> optimize(OptimizationRequest request);

    Optional<List<RebalanceAction>> checkRebalance(RebalanceRequest request);

    record OptimizationRequest(
            List<String> symbols,
            String objective,
            Double riskFreeRate,
            Integer lookbackPeriod,
            Double maxWeight,
            Double minWeight
    ) {
    }

    record RebalanceRequest(
            Map<String, Double> targetWeights,
            Map<String, Double> currentWeights,
            Double threshold
    ) {
    }

    record PortfolioMetrics(
            Double returns,
            Double volatility,
            Double sharpe,
            Double drawdown,
            Map<String, Double> weights
    ) {
    }

    record OptimizationResult(
            PortfolioMetrics portfolioMetrics,
            Map<String, Double> weights,
            String optimizedAt
    ) {
    }

    record RebalanceAction(
            String symbol,
            Double targetWeight,
            Double currentWeight,
            Double deviation,
            Boolean requiresRebalance,
            String action
    ) {
    }
}
