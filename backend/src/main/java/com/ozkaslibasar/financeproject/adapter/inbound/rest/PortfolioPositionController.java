package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.model.PortfolioPosition;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPositionPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * REST controller for managing portfolio positions (individual stock holdings).
 *
 * <p>All operations are scoped to the "default" user until authentication is added.
 * Positions are persisted in PostgreSQL via {@link PortfolioPositionPort}.</p>
 *
 * <p>Endpoints:
 * <ul>
 *   <li>GET    /api/v1/portfolio/positions        — list all positions</li>
 *   <li>POST   /api/v1/portfolio/positions        — add a new position</li>
 *   <li>PUT    /api/v1/portfolio/positions/{id}   — update existing position</li>
 *   <li>DELETE /api/v1/portfolio/positions/{id}   — remove a position</li>
 * </ul>
 * </p>
 */
@Tag(name = "Portfolio Positions", description = "Portfolio position management")
@RestController
@RequestMapping("/api/v1/portfolio/positions")
@RequiredArgsConstructor
@Slf4j
public class PortfolioPositionController {

    private static final String DEFAULT_USER = "default";

    private final PortfolioPositionPort positionPort;
    private final com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort portfolioPort;
    private final com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService ledgerService;

    @Operation(summary = "GET Portfolio Positions endpoint", description = "Implements the GET operation for the Portfolio Positions API described in SPEC.md sections 7 and 8.")
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
    @GetMapping
    public List<PortfolioPosition> getAllPositions() {
        return positionPort.findByUserId(DEFAULT_USER);
    }

    @Operation(summary = "POST Portfolio Positions endpoint", description = "Implements the POST operation for the Portfolio Positions API described in SPEC.md sections 7 and 8.")
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
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public PortfolioPosition addPosition(@RequestBody PositionRequest request) {
        log.info("Adding portfolio position: {} x{}", request.symbol(), request.quantity());
        PortfolioPosition position = new PortfolioPosition(
                null,
                DEFAULT_USER,
                request.symbol(),
                request.quantity(),
                request.avgCostPrice(),
                request.openedAt() != null ? request.openedAt() : LocalDate.now(),
                request.notes(),
                null,
                null
        );
        PortfolioPosition saved = positionPort.save(position);

        // Sync to Transaction Ledger
        syncToLedger(request);

        return saved;
    }

    private void syncToLedger(PositionRequest request) {
        List<com.ozkaslibasar.financeproject.domain.model.Portfolio> portfolios = portfolioPort.findByUserId(DEFAULT_USER);
        com.ozkaslibasar.financeproject.domain.model.Portfolio targetPortfolio;

        if (portfolios.isEmpty()) {
            targetPortfolio = portfolioPort.save(new com.ozkaslibasar.financeproject.domain.model.Portfolio(
                    null, DEFAULT_USER, "Default Portfolio", "USD", null, true, null, null));
        } else {
            targetPortfolio = portfolios.stream()
                    .filter(com.ozkaslibasar.financeproject.domain.model.Portfolio::defaultPortfolio)
                    .findFirst()
                    .orElse(portfolios.get(0));
        }

        ledgerService.addTransaction(new com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction(
                null,
                targetPortfolio.id(),
                DEFAULT_USER,
                request.symbol(),
                com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType.US_STOCK,
                com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction.BUY,
                request.quantity(),
                request.avgCostPrice(),
                targetPortfolio.baseCurrency(),
                BigDecimal.ZERO,
                BigDecimal.ONE,
                request.openedAt() != null ? request.openedAt() : LocalDate.now(),
                com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource.MANUAL,
                request.notes(),
                null,
                null
        ));
    }

    @Operation(summary = "PUT Portfolio Positions endpoint", description = "Implements the PUT operation for the Portfolio Positions API described in SPEC.md sections 7 and 8.")
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
    @PutMapping("/{id}")
    public PortfolioPosition updatePosition(@PathVariable Long id, @RequestBody PositionRequest request) {
        positionPort.findByIdAndUserId(id, DEFAULT_USER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Position not found: " + id));
        log.info("Updating portfolio position id={}: {} x{}", id, request.symbol(), request.quantity());
        PortfolioPosition updated = new PortfolioPosition(
                id,
                DEFAULT_USER,
                request.symbol(),
                request.quantity(),
                request.avgCostPrice(),
                request.openedAt() != null ? request.openedAt() : LocalDate.now(),
                request.notes(),
                null,
                null
        );
        return positionPort.save(updated);
    }

    @Operation(summary = "DELETE Portfolio Positions endpoint", description = "Implements the DELETE operation for the Portfolio Positions API described in SPEC.md sections 7 and 8.")
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
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePosition(@PathVariable Long id) {
        positionPort.findByIdAndUserId(id, DEFAULT_USER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Position not found: " + id));
        log.info("Deleting portfolio position id={}", id);
        positionPort.deleteByIdAndUserId(id, DEFAULT_USER);
    }

    public record PositionRequest(
            String symbol,
            BigDecimal quantity,
            @JsonProperty("avgCostPrice") BigDecimal avgCostPrice,
            @JsonProperty("openedAt") LocalDate openedAt,
            String notes
    ) {}
}
