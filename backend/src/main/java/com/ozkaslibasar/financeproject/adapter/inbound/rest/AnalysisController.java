package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.port.outbound.LlmInsightPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PatternDetectionPort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analysis")
@RequiredArgsConstructor
public class AnalysisController {

    private final PatternDetectionPort patternDetectionPort;
    private final LlmInsightPort llmInsightPort;

    @GetMapping("/patterns/{symbol}")
    public PatternResponse detectPatterns(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1d") String interval,
            @RequestParam(defaultValue = "3mo") String range,
            @RequestParam(defaultValue = "false") boolean includeLlmContext) {
        return patternDetectionPort.detectPatterns(symbol.toUpperCase(), interval, range, includeLlmContext)
                .map(this::toPatternResponse)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Pattern detection unavailable for " + symbol));
    }

    @PostMapping("/decision-support")
    public DecisionSupportResponse decisionSupport(@RequestBody DecisionSupportRequest request) {
        LlmInsightPort.PortfolioContext context = request.portfolioContext() == null ? null : new LlmInsightPort.PortfolioContext(
                request.portfolioContext().currentWeight(),
                request.portfolioContext().targetWeight(),
                request.portfolioContext().deviation(),
                request.portfolioContext().rebalanceNeeded());
        LlmInsightPort.DecisionSupportRequest portRequest = new LlmInsightPort.DecisionSupportRequest(
                request.symbol().toUpperCase(),
                context,
                request.userScenario());

        return llmInsightPort.generateDecisionSupport(portRequest)
                .map(this::toDecisionSupportResponse)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Decision support unavailable for " + request.symbol()));
    }

    private PatternResponse toPatternResponse(PatternDetectionPort.PatternDetectionResult result) {
        return new PatternResponse(
                result.symbol(),
                result.interval(),
                result.patterns().stream().map(this::toDetectedPatternResponse).toList(),
                result.dominantPattern() == null ? null : toDetectedPatternResponse(result.dominantPattern()),
                result.llmContext(),
                result.detectedAt());
    }

    private DetectedPatternResponse toDetectedPatternResponse(PatternDetectionPort.DetectedPattern pattern) {
        return new DetectedPatternResponse(
                pattern.patternType(),
                pattern.direction(),
                pattern.confidence(),
                pattern.startIndex(),
                pattern.endIndex(),
                pattern.description(),
                pattern.priceTarget());
    }

    private DecisionSupportResponse toDecisionSupportResponse(LlmInsightPort.DecisionSupportResult result) {
        return new DecisionSupportResponse(
                result.symbol(),
                result.executiveSummary(),
                result.primarySignal(),
                result.convictionLevel(),
                result.bullCase(),
                result.bearCase(),
                result.criticalLevels(),
                result.riskReward(),
                result.timeHorizon(),
                result.watchlistItems(),
                result.fullAnalysis(),
                result.generatedAt());
    }

    public record PatternResponse(
            String symbol,
            String interval,
            List<DetectedPatternResponse> patterns,
            DetectedPatternResponse dominantPattern,
            String llmContext,
            Long detectedAt) {
    }

    public record DetectedPatternResponse(
            String patternType,
            String direction,
            Double confidence,
            Integer startIndex,
            Integer endIndex,
            String description,
            Double priceTarget) {
    }

    public record DecisionSupportRequest(
            String symbol,
            PortfolioContextRequest portfolioContext,
            String userScenario) {
    }

    public record PortfolioContextRequest(
            Double currentWeight,
            Double targetWeight,
            Double deviation,
            Boolean rebalanceNeeded) {
    }

    public record DecisionSupportResponse(
            String symbol,
            String executiveSummary,
            String primarySignal,
            Integer convictionLevel,
            List<String> bullCase,
            List<String> bearCase,
            Map<String, Double> criticalLevels,
            String riskReward,
            String timeHorizon,
            List<String> watchlistItems,
            String fullAnalysis,
            Long generatedAt) {
    }
}
