package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.ozkaslibasar.financeproject.domain.model.PortfolioPosition;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPositionPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Tag(name = "Portfolio Dashboard", description = "Portfolio summary, performance, allocation, and enriched positions")
@RestController
@RequestMapping("/api/v1/portfolio")
@RequiredArgsConstructor
public class PortfolioDashboardController {

    private static final String DEFAULT_USER = "default";

    private final PortfolioPositionPort positionPort;
    private final PriceRepositoryPort priceRepositoryPort;

    @Operation(summary = "GET Portfolio Dashboard endpoint", description = "Implements the GET operation for the Portfolio Dashboard API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/summary")
    public PortfolioSummary getSummary() {
        List<EnrichedPosition> positions = getEnrichedPositions();
        BigDecimal totalValue = sum(positions.stream().map(EnrichedPosition::marketValue).toList());
        BigDecimal costBasis = sum(positions.stream().map(EnrichedPosition::costBasis).toList());
        BigDecimal totalPnl = totalValue.subtract(costBasis);
        return new PortfolioSummary(
                totalValue,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                totalPnl,
                percent(totalPnl, costBasis));
    }

    @Operation(summary = "GET Portfolio Dashboard endpoint", description = "Implements the GET operation for the Portfolio Dashboard API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/performance")
    public PortfolioPerformance getPerformance(
            @RequestParam(defaultValue = "1M") String period,
            @RequestParam(required = false) String benchmark) {
        BigDecimal totalValue = getSummary().totalValue();
        return new PortfolioPerformance(
                period,
                List.of(new PortfolioPerformancePoint(LocalDate.now().toString(), totalValue, null)),
                new PortfolioMetrics(null, null));
    }

    @Operation(summary = "GET Portfolio Dashboard endpoint", description = "Implements the GET operation for the Portfolio Dashboard API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/allocation")
    public PortfolioAllocation getAllocation() {
        List<EnrichedPosition> positions = getEnrichedPositions();
        BigDecimal totalValue = sum(positions.stream().map(EnrichedPosition::marketValue).toList());
        List<AllocationSlice> byAsset = positions.stream()
                .map(position -> new AllocationSlice(
                        position.symbol(),
                        percent(position.marketValue(), totalValue),
                        position.marketValue(),
                        null))
                .toList();
        return new PortfolioAllocation(List.of(), byAsset, List.of());
    }

    @Operation(summary = "GET Portfolio Dashboard endpoint", description = "Implements the GET operation for the Portfolio Dashboard API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/positions/enriched")
    public List<EnrichedPosition> getEnrichedPositions() {
        List<PortfolioPosition> positions = positionPort.findByUserId(DEFAULT_USER);
        BigDecimal totalValue = sum(positions.stream().map(this::marketValue).toList());
        return positions.stream()
                .map(position -> toEnriched(position, totalValue))
                .toList();
    }

    private EnrichedPosition toEnriched(PortfolioPosition position, BigDecimal totalValue) {
        BigDecimal currentPrice = currentPrice(position);
        BigDecimal costBasis = position.quantity().multiply(position.avgCostPrice());
        BigDecimal marketValue = position.quantity().multiply(currentPrice);
        BigDecimal unrealizedPnl = marketValue.subtract(costBasis);
        return new EnrichedPosition(
                position.symbol(),
                position.symbol(),
                position.quantity(),
                position.avgCostPrice(),
                currentPrice,
                costBasis,
                marketValue,
                percent(marketValue, totalValue),
                BigDecimal.ZERO,
                percent(unrealizedPnl, costBasis),
                unrealizedPnl);
    }

    private BigDecimal marketValue(PortfolioPosition position) {
        return position.quantity().multiply(currentPrice(position));
    }

    private BigDecimal currentPrice(PortfolioPosition position) {
        return priceRepositoryPort.findLatestByAssetId(position.symbol().toUpperCase())
                .map(price -> price.close())
                .orElse(position.avgCostPrice());
    }

    private BigDecimal sum(List<BigDecimal> values) {
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal percent(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return numerator.multiply(BigDecimal.valueOf(100)).divide(denominator, 4, RoundingMode.HALF_UP);
    }

    public record PortfolioSummary(
            BigDecimal totalValue,
            BigDecimal cashBalance,
            BigDecimal dailyPnL,
            BigDecimal dailyPnLPercent,
            BigDecimal totalPnL,
            BigDecimal totalReturn) {
    }

    public record PortfolioPerformance(String period, List<PortfolioPerformancePoint> series, PortfolioMetrics metrics) {
    }

    public record PortfolioPerformancePoint(String date, BigDecimal portfolioValue, BigDecimal benchmarkValue) {
    }

    public record PortfolioMetrics(Double sharpe, Double maxDrawdown) {
    }

    public record PortfolioAllocation(List<AllocationSlice> bySector, List<AllocationSlice> byAsset, List<AllocationSlice> byCountry) {
    }

    public record AllocationSlice(String name, BigDecimal value, BigDecimal amount, String color) {
    }

    public record EnrichedPosition(
            String symbol,
            String company,
            BigDecimal shares,
            BigDecimal avgCost,
            BigDecimal currentPrice,
            BigDecimal costBasis,
            BigDecimal marketValue,
            BigDecimal allocation,
            BigDecimal dailyReturn,
            BigDecimal totalReturn,
            BigDecimal unrealizedPnL) {
    }
}