package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.model.FinancialHistorySnapshot;
import com.ozkaslibasar.financeproject.domain.model.FinancialHistoryStatus;
import com.ozkaslibasar.financeproject.domain.model.FinancialYearRaw;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialHistoryPort;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Adapter implementing {@link FinancialHistoryPort} against the data-service route
 * {@code GET /api/v1/research/financial-history/{symbol}}.
 *
 * <p>Missing values stay {@code null}; any failure yields an UNAVAILABLE snapshot with
 * no years and is never thrown.</p>
 */
@Component
@Slf4j
public class DataServiceFinancialHistoryAdapter implements FinancialHistoryPort {

    private final RestTemplate restTemplate;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String dataServiceBaseUrl;

    public DataServiceFinancialHistoryAdapter(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public FinancialHistorySnapshot fetchHistory(String symbol) {
        String url = dataServiceBaseUrl + "/api/v1/research/financial-history/{symbol}";
        try {
            HistoryResponse response = restTemplate.getForObject(url, HistoryResponse.class, symbol);
            if (response == null) {
                return unavailable(symbol, "empty response");
            }
            return map(symbol, response);
        } catch (Exception e) {
            return unavailable(symbol, e.getClass().getSimpleName() + ": " + e.getMessage());
        }
    }

    private FinancialHistorySnapshot map(String symbol, HistoryResponse response) {
        FinancialHistoryStatus status = parseStatus(response.getStatus());
        List<String> dates = response.getFiscalYearEnds() == null ? List.of() : response.getFiscalYearEnds();
        Map<String, List<Double>> series = response.getSeries() == null ? Map.of() : response.getSeries();
        int size = dates.size();
        for (Map.Entry<String, List<Double>> entry : series.entrySet()) {
            if (entry.getValue() != null && entry.getValue().size() != size) {
                throw new IllegalArgumentException("series " + entry.getKey() + " length != fiscal_year_ends");
            }
        }
        List<FinancialYearRaw> years = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            LocalDate end = LocalDate.parse(dates.get(i));
            years.add(new FinancialYearRaw(
                    FinancialYearRaw.fiscalYearOf(end), end,
                    value(series, "revenue", i),
                    value(series, "net_income", i),
                    value(series, "operating_cash_flow", i),
                    value(series, "capital_expenditure", i),
                    value(series, "total_assets", i),
                    value(series, "total_liabilities", i),
                    value(series, "total_equity", i),
                    value(series, "total_debt", i),
                    value(series, "cash", i),
                    value(series, "current_assets", i),
                    value(series, "current_liabilities", i)));
        }
        return new FinancialHistorySnapshot(symbol, status, response.getCurrency(),
                parseInstant(response.getRetrievedAt()), years);
    }

    private static FinancialHistoryStatus parseStatus(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("missing status");
        }
        return switch (raw) {
            case "AVAILABLE" -> FinancialHistoryStatus.AVAILABLE;
            case "PARTIAL" -> FinancialHistoryStatus.PARTIAL;
            case "EMPTY" -> FinancialHistoryStatus.EMPTY;
            default -> throw new IllegalArgumentException("unknown status " + raw);
        };
    }

    private static BigDecimal value(Map<String, List<Double>> series, String key, int index) {
        List<Double> values = series.get(key);
        if (values == null) {
            return null;
        }
        Double v = values.get(index);
        return v == null ? null : BigDecimal.valueOf(v);
    }

    private static Instant parseInstant(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(raw).toInstant();
        } catch (java.time.format.DateTimeParseException e) {
            return LocalDateTime.parse(raw).toInstant(ZoneOffset.UTC);
        }
    }

    private FinancialHistorySnapshot unavailable(String symbol, String reason) {
        log.warn("operation=financial_history provider=data-service symbol={} result=unavailable reason={}",
                symbol, reason);
        return new FinancialHistorySnapshot(symbol, FinancialHistoryStatus.UNAVAILABLE, null, null, List.of());
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class HistoryResponse {
        private String status;
        private String currency;

        @JsonProperty("period_type")
        private String periodType;

        @JsonProperty("fiscal_year_ends")
        private List<String> fiscalYearEnds;

        private Map<String, List<Double>> series;

        @JsonProperty("retrieved_at")
        private String retrievedAt;
    }
}
