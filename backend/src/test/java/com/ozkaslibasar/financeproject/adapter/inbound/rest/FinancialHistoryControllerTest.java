package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.FinancialHistory;
import com.ozkaslibasar.financeproject.domain.model.FinancialHistoryPoint;
import com.ozkaslibasar.financeproject.domain.model.FinancialHistoryStatus;
import com.ozkaslibasar.financeproject.domain.service.FinancialHistoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = FinancialHistoryController.class)
class FinancialHistoryControllerTest {

    private static final String PATH = "/api/v1/fundamentals/{symbol}/history";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FinancialHistoryService service;

    static FinancialHistoryPoint point(int year, LocalDate end, BigDecimal debtToEquity, List<String> notMeaningful) {
        BigDecimal v = new BigDecimal("100");
        return new FinancialHistoryPoint(year, end, v, v, v, v, v, v, v, v, v, v, v,
                debtToEquity, null, null, null, null, null, null, null, notMeaningful);
    }

    static FinancialHistory history(FinancialHistoryStatus status, List<FinancialHistoryPoint> points) {
        return new FinancialHistory("AAPL", status, "USD", Instant.parse("2026-01-01T00:00:00Z"), points);
    }

    @Test
    void returnsDocumentedJsonShape() throws Exception {
        when(service.getHistory("AAPL")).thenReturn(history(FinancialHistoryStatus.AVAILABLE, List.of(
                point(2023, LocalDate.of(2023, 9, 30), new BigDecimal("1.5"), List.of()),
                point(2024, LocalDate.of(2024, 9, 28), null, List.of("debtToEquity")))));

        mockMvc.perform(get(PATH, "AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.currency").value("USD"))
                .andExpect(jsonPath("$.periodType").value("annual"))
                .andExpect(jsonPath("$.retrievedAt").value("2026-01-01T00:00:00Z"))
                .andExpect(jsonPath("$.points.length()").value(2))
                .andExpect(jsonPath("$.points[0].fiscalYear").value(2023))
                .andExpect(jsonPath("$.points[1].fiscalYear").value(2024))
                .andExpect(jsonPath("$.points[1].fiscalYearEnd").value("2024-09-28"))
                .andExpect(jsonPath("$.points[0].debtToEquity").value(1.5))
                .andExpect(jsonPath("$.points[0].notMeaningful").isArray())
                .andExpect(jsonPath("$.points[0].notMeaningful.length()").value(0))
                .andExpect(jsonPath("$.points[1].notMeaningful[0]").value("debtToEquity"))
                .andExpect(jsonPath("$.points[0].revenue").exists())
                .andExpect(jsonPath("$.points[0].freeCashFlow").exists())
                .andExpect(jsonPath("$.points[0].netDebt").exists())
                .andExpect(jsonPath("$.points[0].totalLiabilities").exists())
                .andExpect(jsonPath("$.points[0].netIncomeGrowth").hasJsonPath());
    }

    @Test
    void uppercasesSymbol() throws Exception {
        when(service.getHistory("AAPL")).thenReturn(history(FinancialHistoryStatus.EMPTY, List.of()));

        mockMvc.perform(get(PATH, "aapl").accept(APPLICATION_JSON)).andExpect(status().isOk());

        verify(service).getHistory("AAPL");
    }

    @Test
    void unavailableIsStill200WithStatus() throws Exception {
        when(service.getHistory("AAPL")).thenReturn(
                new FinancialHistory("AAPL", FinancialHistoryStatus.UNAVAILABLE, null, null, List.of()));

        mockMvc.perform(get(PATH, "AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNAVAILABLE"))
                .andExpect(jsonPath("$.points.length()").value(0));
    }

    @Test
    void nullValuesSerializeAsJsonNull() throws Exception {
        when(service.getHistory("AAPL")).thenReturn(
                new FinancialHistory("AAPL", FinancialHistoryStatus.PARTIAL, null, null, List.of(
                        point(2024, LocalDate.of(2024, 12, 31), null, List.of()))));

        mockMvc.perform(get(PATH, "AAPL").accept(APPLICATION_JSON))
                .andExpect(jsonPath("$.currency").hasJsonPath())
                .andExpect(jsonPath("$.currency").value((Object) null))
                .andExpect(jsonPath("$.retrievedAt").hasJsonPath())
                .andExpect(jsonPath("$.retrievedAt").value((Object) null))
                .andExpect(jsonPath("$.points[0].debtToEquity").hasJsonPath())
                .andExpect(jsonPath("$.points[0].debtToEquity").value((Object) null));
    }

    @Test
    void cacheAnnotation_excludesUnavailable() throws Exception {
        Cacheable cacheable = FinancialHistoryController.class.getMethod("getHistory", String.class)
                .getAnnotation(Cacheable.class);

        assertThat(cacheable.value()).containsExactly("fundamentalCache");
        assertThat(cacheable.key()).isEqualTo("'history:' + #symbol.toUpperCase()");
        assertThat(cacheable.unless()).contains("UNAVAILABLE");
    }
}
