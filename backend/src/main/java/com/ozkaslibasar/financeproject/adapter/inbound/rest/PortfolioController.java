package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioOptimizationPort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioOptimizationPort portfolioOptimizationPort;

    @PostMapping("/optimize")
    public PortfolioOptimizationPort.OptimizationResult optimize(@RequestBody OptimizeRequest request) {
        PortfolioOptimizationPort.OptimizationRequest optimizeRequest = new PortfolioOptimizationPort.OptimizationRequest(
                request.symbols(),
                request.objective(),
                request.riskFreeRate(),
                request.lookbackPeriod(),
                request.maxWeight(),
                request.minWeight()
        );

        return portfolioOptimizationPort.optimize(optimizeRequest)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Portfolio optimization service is unavailable"
                ));
    }

    @PostMapping("/rebalance-check")
    public RebalanceResponse rebalanceCheck(@RequestBody RebalanceRequest request) {
        PortfolioOptimizationPort.RebalanceRequest rebalanceRequest = new PortfolioOptimizationPort.RebalanceRequest(
                request.targetWeights(),
                request.currentWeights(),
                request.threshold()
        );

        List<PortfolioOptimizationPort.RebalanceAction> actions = portfolioOptimizationPort.checkRebalance(rebalanceRequest)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Portfolio optimization service is unavailable"
                ));

        return new RebalanceResponse(actions);
    }

    public record OptimizeRequest(
            List<String> symbols,
            String objective,
            @JsonProperty("risk_free_rate") Double riskFreeRate,
            @JsonProperty("lookback_period") Integer lookbackPeriod,
            @JsonProperty("max_weight") Double maxWeight,
            @JsonProperty("min_weight") Double minWeight
    ) {
    }

    public record RebalanceRequest(
            @JsonProperty("target_weights") Map<String, Double> targetWeights,
            @JsonProperty("current_weights") Map<String, Double> currentWeights,
            Double threshold
    ) {
    }

    public record RebalanceResponse(List<PortfolioOptimizationPort.RebalanceAction> actions) {
    }
}
