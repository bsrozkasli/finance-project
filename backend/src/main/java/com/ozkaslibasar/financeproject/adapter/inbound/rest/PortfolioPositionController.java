package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.model.PortfolioPosition;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPositionPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RestController
@RequestMapping("/api/v1/portfolio/positions")
@RequiredArgsConstructor
@Slf4j
public class PortfolioPositionController {

    private static final String DEFAULT_USER = "default";

    private final PortfolioPositionPort positionPort;

    @GetMapping
    public List<PortfolioPosition> getAllPositions() {
        return positionPort.findByUserId(DEFAULT_USER);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
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
        return positionPort.save(position);
    }

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
