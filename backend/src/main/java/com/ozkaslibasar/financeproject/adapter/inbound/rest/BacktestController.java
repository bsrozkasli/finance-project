package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice.DataServiceBacktestAdapter;
import com.ozkaslibasar.financeproject.domain.model.BacktestResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Backtests", description = "Strategy backtest results")
@RestController
@RequestMapping("/api/v1/backtest")
@RequiredArgsConstructor
public class BacktestController {

    private final DataServiceBacktestAdapter backtestAdapter;

    @Operation(summary = "GET Backtests endpoint", description = "Implements the GET operation for the Backtests API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/{symbol}")
    public ResponseEntity<BacktestResult> getBacktest(@PathVariable String symbol) {
        BacktestResult result = backtestAdapter.getBacktest(symbol);
        return ResponseEntity.ok(result);
    }
}
