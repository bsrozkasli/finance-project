package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.CreatePortfolioStateRequest;
import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.PortfolioStateResponse;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioStateService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;

@Tag(name = "Portfolio States", description = "Persisted, replayable Portfolio States derived from the ledger")
@RestController
@RequestMapping("/api/v1/portfolios/{portfolioId}/states")
@RequiredArgsConstructor
public class PortfolioStateController {

    private static final String DEFAULT_USER = "default";

    private final PortfolioPort portfolioPort;
    private final PortfolioStateService stateService;
    private final Clock clock;

    @PostMapping
    public ResponseEntity<PortfolioStateResponse> create(@PathVariable Long portfolioId,
                                                         @RequestBody CreatePortfolioStateRequest request) {
        requirePortfolio(portfolioId);
        if (request.asOf() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "asOf is required (YYYY-MM-DD)");
        }
        if (request.asOf().isAfter(LocalDate.now(clock.withZone(ZoneOffset.UTC)))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "asOf must not be after today (UTC)");
        }
        PortfolioStateService.CreatedState result = stateService.create(portfolioId, DEFAULT_USER, request.asOf());
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(PortfolioStateResponse.from(result.state()));
    }

    @GetMapping("/{version}")
    public PortfolioStateResponse get(@PathVariable Long portfolioId, @PathVariable String version) {
        requirePortfolio(portfolioId);
        return stateService.replay(portfolioId, DEFAULT_USER, version)
                .map(PortfolioStateResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Portfolio state not found: " + version));
    }

    private void requirePortfolio(Long portfolioId) {
        portfolioPort.findByIdAndUserId(portfolioId, DEFAULT_USER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Portfolio not found: " + portfolioId));
    }
}
