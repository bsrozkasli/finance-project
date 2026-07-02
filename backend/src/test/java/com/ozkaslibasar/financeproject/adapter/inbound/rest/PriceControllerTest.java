package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper.RestMapper;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
    controllers = PriceController.class,
    includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = RestMapper.class)
)
class PriceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PriceRefreshService priceRefreshService;

    @Test
    void shouldReturnLatestPriceWhenFound() throws Exception {
        PriceHistory price = price("AAPL", "155", Instant.parse("2026-05-13T00:00:00Z"));

        when(priceRefreshService.getFreshLatest("AAPL")).thenReturn(Optional.of(price));

        mockMvc.perform(get("/api/v1/prices/AAPL/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assetId").value("AAPL"))
                .andExpect(jsonPath("$.close").value(155));
    }

    @Test
    void shouldReturn404WhenPriceNotFound() throws Exception {
        when(priceRefreshService.getFreshLatest("UNKNOWN")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/prices/UNKNOWN/latest"))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnFreshHistoryFromRefreshService() throws Exception {
        PriceHistory stale = price("NVDA", "200", Instant.now().minusSeconds(3 * 86400L));
        PriceHistory fresh = price("NVDA", "195", Instant.now().minusSeconds(60));

        when(priceRefreshService.getFreshHistory("NVDA", "1d", "5d")).thenReturn(List.of(stale, fresh));

        mockMvc.perform(get("/api/v1/prices/nvda/history?interval=1d&range=5d"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].close").value(200))
                .andExpect(jsonPath("$[1].close").value(195));
    }

    private PriceHistory price(String symbol, String close, Instant timestamp) {
        BigDecimal value = new BigDecimal(close);
        return new PriceHistory(
                symbol,
                value,
                value,
                value,
                value,
                BigDecimal.valueOf(1000),
                timestamp);
    }
}
