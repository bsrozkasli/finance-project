package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.FinnhubClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubNewsDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubPriceTargetDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubRecommendationDto;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Tag(name = "Reports", description = "Company report endpoints")
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class CompanyReportController {

    private final TechnicalAnalysisPort technicalAnalysisPort;
    private final FinnhubClient finnhubClient;

    @Operation(summary = "GET Reports endpoint", description = "Implements the GET operation for the Reports API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/company/{symbol}")
    public CompanyReport getCompanyReport(@PathVariable String symbol) {
        String normalized = symbol.toUpperCase();
        TechnicalResult technical = null;
        try {
            technical = technicalAnalysisPort.fetchTechnicalAnalysis(normalized, "1d", "3mo")
                    .map(this::toTechnicalResult)
                    .orElse(null);
        } catch (Exception ignored) {
            technical = null;
        }
        return new CompanyReport(
                normalized,
                technical,
                finnhubClient.getRecommendations(normalized),
                finnhubClient.getPriceTarget(normalized),
                recentNews(normalized));
    }

    private List<FinnhubNewsDto> recentNews(String symbol) {
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(7);
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;
        return finnhubClient.getCompanyNews(symbol, from.format(formatter), to.format(formatter));
    }

    private TechnicalResult toTechnicalResult(TechnicalAnalysisPort.TechnicalAnalysisResult result) {
        return new TechnicalResult(
                result.symbol(),
                result.rsi(),
                result.macd(),
                result.macdSignal(),
                result.macdHistogram(),
                result.bbUpper(),
                result.bbMiddle(),
                result.bbLower(),
                result.atr(),
                result.sma(),
                result.ema(),
                result.action(),
                result.confidence());
    }

    public record CompanyReport(
            String symbol,
            TechnicalResult technical,
            List<FinnhubRecommendationDto> recommendations,
            FinnhubPriceTargetDto priceTarget,
            List<FinnhubNewsDto> recentNews) {
    }

    public record TechnicalResult(
            String symbol,
            Double rsi,
            Double macd,
            Double macdSignal,
            Double macdHistogram,
            Double bbUpper,
            Double bbMiddle,
            Double bbLower,
            Double atr,
            Double sma,
            Double ema,
            String signalAction,
            Double signalConfidence) {
    }
}
