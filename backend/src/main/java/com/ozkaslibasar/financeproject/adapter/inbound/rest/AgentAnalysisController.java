package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.AgentAnalysisResponseDto;
import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/agent-analysis")
@RequiredArgsConstructor
public class AgentAnalysisController {

    private final AgentAnalysisFacade agentAnalysisFacade;

    @GetMapping("/{ticker}")
    public AgentAnalysisResponseDto getAgentAnalysis(@PathVariable String ticker) {
        return agentAnalysisFacade.getAnalysis(ticker)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Agent analysis unavailable for " + ticker));
    }

    @DeleteMapping("/{ticker}/cache")
    public ResponseEntity<Void> invalidateCache(@PathVariable String ticker) {
        agentAnalysisFacade.invalidateCache(ticker);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/cache")
    public ResponseEntity<Void> invalidateAllCache() {
        agentAnalysisFacade.invalidateAllCache();
        return ResponseEntity.noContent().build();
    }

    private AgentAnalysisResponseDto toDto(AgentAnalysisResult result) {
        return new AgentAnalysisResponseDto(
                result.ticker(),
                result.decision(),
                result.confidence(),
                result.fundamentalSummary(),
                result.technicalSummary(),
                result.riskSummary(),
                result.bullCase(),
                result.bearCase(),
                result.portfolioManagerReasoning(),
                result.metricsUsed(),
                result.generatedAt().toString(),
                result.fromCache()
        );
    }
}
