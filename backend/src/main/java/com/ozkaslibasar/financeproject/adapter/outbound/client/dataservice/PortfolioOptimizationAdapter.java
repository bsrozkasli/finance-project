package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioOptimizationPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeSet;

@Component
@Slf4j
public class PortfolioOptimizationAdapter implements PortfolioOptimizationPort {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public PortfolioOptimizationAdapter(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<OptimizationResult> optimize(OptimizationRequest request) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("symbols", request.symbols());
            body.put("objective", request.objective());
            body.put("risk_free_rate", request.riskFreeRate());
            body.put("lookback_period", request.lookbackPeriod());
            body.put("max_weight", request.maxWeight());
            body.put("min_weight", request.minWeight());

            Object raw = restTemplate.postForObject(baseUrl + "/api/v1/portfolio/optimize", body, Object.class);
            if (raw == null) {
                return Optional.empty();
            }

            JsonNode root = objectMapper.valueToTree(raw);
            JsonNode metricsNode = root.path("portfolio_metrics");
            if (metricsNode.isMissingNode() || metricsNode.isNull()) {
                return Optional.empty();
            }

            Map<String, Double> weights = objectMapper.convertValue(
                    metricsNode.path("weights"),
                    objectMapper.getTypeFactory().constructMapType(Map.class, String.class, Double.class)
            );

            PortfolioMetrics metrics = new PortfolioMetrics(
                    readDouble(metricsNode, "returns"),
                    readDouble(metricsNode, "volatility"),
                    readDouble(metricsNode, "sharpe"),
                    readDouble(metricsNode, "drawdown"),
                    weights
            );

            return Optional.of(new OptimizationResult(metrics, weights, readText(root, "optimized_at")));
        } catch (Exception e) {
            log.warn("Failed portfolio optimization request. Returning empty result. Reason: {}", e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<List<RebalanceAction>> checkRebalance(RebalanceRequest request) {
        try {
            double threshold = request.threshold() == null ? 0.05 : request.threshold();
            Map<String, Double> targets = request.targetWeights() == null ? Map.of() : request.targetWeights();
            Map<String, Double> current = request.currentWeights() == null ? Map.of() : request.currentWeights();

            TreeSet<String> symbols = new TreeSet<>();
            symbols.addAll(targets.keySet());
            symbols.addAll(current.keySet());

            List<RebalanceAction> actions = new ArrayList<>();
            for (String symbol : symbols) {
                double target = targets.getOrDefault(symbol, 0.0d);
                double now = current.getOrDefault(symbol, 0.0d);
                double deviation = now - target;
                String action;
                if (deviation > threshold) {
                    action = "SELL";
                } else if (deviation < -threshold) {
                    action = "BUY";
                } else {
                    action = "HOLD";
                }

                actions.add(new RebalanceAction(
                        symbol,
                        target,
                        now,
                        deviation,
                        !"HOLD".equals(action),
                        action
                ));
            }

            actions.sort(Comparator.comparing(RebalanceAction::symbol));
            return Optional.of(actions);
        } catch (Exception e) {
            log.warn("Failed rebalance check. Returning empty result. Reason: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Double readDouble(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        return value.isNumber() ? value.doubleValue() : null;
    }

    private String readText(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        return value.isTextual() ? value.textValue() : null;
    }
}
