package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice.DataServiceBacktestAdapter;
import com.ozkaslibasar.financeproject.domain.model.BacktestResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/backtest")
@RequiredArgsConstructor
public class BacktestController {

    private final DataServiceBacktestAdapter backtestAdapter;

    @GetMapping("/{symbol}")
    public ResponseEntity<BacktestResult> getBacktest(@PathVariable String symbol) {
        BacktestResult result = backtestAdapter.getBacktest(symbol);
        return ResponseEntity.ok(result);
    }
}
