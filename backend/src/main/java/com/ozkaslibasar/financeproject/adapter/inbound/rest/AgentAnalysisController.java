package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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

@Tag(name = "Agent Analysis", description = "Multi-agent market analysis and cache management")
@RestController
@RequestMapping("/api/v1/agent-analysis")
@RequiredArgsConstructor
public class AgentAnalysisController {

    private final AgentAnalysisFacade agentAnalysisFacade;

    @Operation(summary = "GET Agent Analysis endpoint", description = "Implements the GET operation for the Agent Analysis API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping("/{ticker}")
    public AgentAnalysisResponseDto getAgentAnalysis(@PathVariable String ticker) {
        return agentAnalysisFacade.getAnalysis(ticker)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Agent analysis unavailable for " + ticker));
    }

    @Operation(summary = "DELETE Agent Analysis endpoint", description = "Implements the DELETE operation for the Agent Analysis API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @DeleteMapping("/{ticker}/cache")
    public ResponseEntity<Void> invalidateCache(@PathVariable String ticker) {
        agentAnalysisFacade.invalidateCache(ticker);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "DELETE Agent Analysis endpoint", description = "Implements the DELETE operation for the Agent Analysis API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
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
