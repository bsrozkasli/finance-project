package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.ozkaslibasar.financeproject.domain.model.BacktestResult;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@Slf4j
public class DataServiceBacktestAdapter {

    private final RestTemplate restTemplate;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public DataServiceBacktestAdapter(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public BacktestResult getBacktest(String symbol) {
        try {
            String url = baseUrl + "/api/v1/backtest/" + symbol;
            BacktestResponseDto dto = restTemplate.getForObject(url, BacktestResponseDto.class);
            if (dto == null) {
                return emptyResult(symbol);
            }
            return BacktestResult.builder()
                    .symbol(dto.getSymbol())
                    .currentRsi(dto.getCurrent_rsi())
                    .scenarioDescription(dto.getScenario_description())
                    .totalOccurrences(dto.getTotal_occurrences())
                    .winRate(dto.getWin_rate())
                    .averageReturnPct(dto.getAverage_return_pct())
                    .isMeaningful(dto.is_meaningful())
                    .build();
        } catch (Exception e) {
            log.error("Failed to fetch backtest for symbol {}: {}", symbol, e.getMessage());
            return emptyResult(symbol);
        }
    }

    private BacktestResult emptyResult(String symbol) {
        return BacktestResult.builder()
                .symbol(symbol)
                .currentRsi(0.0)
                .scenarioDescription("Hata oluştu veya veri yok")
                .totalOccurrences(0)
                .winRate(0.0)
                .averageReturnPct(0.0)
                .isMeaningful(false)
                .build();
    }

    @Data
    public static class BacktestResponseDto {
        private String symbol;
        private Double current_rsi;
        private String scenario_description;
        private Integer total_occurrences;
        private Double win_rate;
        private Double average_return_pct;
        private boolean is_meaningful;
    }
}
