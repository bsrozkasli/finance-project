package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.port.outbound.MarketSessionPort;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/market")
@RequiredArgsConstructor
public class MarketSessionController {
    private final MarketSessionPort marketSessionPort;

    @GetMapping("/sessions")
    public List<MarketSessionResponse> getSessions(@RequestParam(defaultValue = "XNYS,XIST") String exchanges) {
        List<String> values = Arrays.stream(exchanges.split(",")).map(String::trim).filter(value -> !value.isBlank()).map(String::toUpperCase).toList();
        return marketSessionPort.fetchSessions(values).stream().map(value -> new MarketSessionResponse(
                value.exchange(), value.state(), value.timezone(), value.nextOpen(), value.nextClose(), value.source())).toList();
    }

    public record MarketSessionResponse(String exchange, String state, String timezone, String nextOpen, String nextClose, String source) {}
}