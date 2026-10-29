package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.FinancialHistory;
import com.ozkaslibasar.financeproject.domain.model.FinancialHistoryPoint;
import com.ozkaslibasar.financeproject.domain.service.FinancialHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@Tag(name = "Fundamentals", description = "Fundamentals, ratios, earnings, insider, and institutional data")
@RestController
@RequestMapping("/api/v1/fundamentals")
@RequiredArgsConstructor
public class FinancialHistoryController {

    private final FinancialHistoryService financialHistoryService;

    @Operation(summary = "Multi-year financial history",
            description = "Annual statement values and derived ratios; business states are reported in status with HTTP 200.")
    @GetMapping("/{symbol}/history")
    @Cacheable(value = "fundamentalCache", key = "'history:' + #symbol.toUpperCase()",
            unless = "#result.status() == 'UNAVAILABLE'")
    public FinancialHistoryResponse getHistory(@PathVariable String symbol) {
        return toResponse(financialHistoryService.getHistory(symbol.toUpperCase()));
    }

    private static FinancialHistoryResponse toResponse(FinancialHistory history) {
        return new FinancialHistoryResponse(
                history.symbol(),
                history.status().name(),
                history.currency(),
                "annual",
                history.retrievedAt() == null ? null : history.retrievedAt().toString(),
                history.points().stream().map(FinancialHistoryController::toPoint).toList());
    }

    private static FinancialHistoryPointResponse toPoint(FinancialHistoryPoint p) {
        return new FinancialHistoryPointResponse(
                p.fiscalYear(),
                p.fiscalYearEnd() == null ? null : p.fiscalYearEnd().toString(),
                p.revenue(), p.netIncome(), p.operatingCashFlow(), p.capitalExpenditure(), p.freeCashFlow(),
                p.totalAssets(), p.totalLiabilities(), p.totalEquity(), p.totalDebt(), p.cash(), p.netDebt(),
                p.debtToEquity(), p.currentRatio(), p.roe(), p.roa(), p.netMargin(), p.fcfMargin(),
                p.revenueGrowth(), p.netIncomeGrowth(),
                p.notMeaningful() == null ? List.of() : List.copyOf(p.notMeaningful()));
    }

    public record FinancialHistoryResponse(
            String symbol,
            String status,
            String currency,
            String periodType,
            String retrievedAt,
            List<FinancialHistoryPointResponse> points) {
    }

    public record FinancialHistoryPointResponse(
            int fiscalYear,
            String fiscalYearEnd,
            BigDecimal revenue,
            BigDecimal netIncome,
            BigDecimal operatingCashFlow,
            BigDecimal capitalExpenditure,
            BigDecimal freeCashFlow,
            BigDecimal totalAssets,
            BigDecimal totalLiabilities,
            BigDecimal totalEquity,
            BigDecimal totalDebt,
            BigDecimal cash,
            BigDecimal netDebt,
            BigDecimal debtToEquity,
            BigDecimal currentRatio,
            BigDecimal roe,
            BigDecimal roa,
            BigDecimal netMargin,
            BigDecimal fcfMargin,
            BigDecimal revenueGrowth,
            BigDecimal netIncomeGrowth,
            List<String> notMeaningful) {
    }
}
