package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper.RestMapper;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
    controllers = PriceController.class,
    includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = RestMapper.class)
)
class PriceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PriceRepositoryPort priceRepositoryPort;

    @Test
    void shouldReturnLatestPriceWhenFound() throws Exception {
        PriceHistory price = new PriceHistory(
                "AAPL",
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(155),
                BigDecimal.valueOf(156),
                BigDecimal.valueOf(149),
                BigDecimal.valueOf(10000),
                Instant.parse("2026-05-13T00:00:00Z")
        );

        when(priceRepositoryPort.findLatestByAssetId("AAPL")).thenReturn(Optional.of(price));

        mockMvc.perform(get("/api/v1/prices/AAPL/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assetId").value("AAPL"))
                .andExpect(jsonPath("$.close").value(155));
    }

    @Test
    void shouldReturn404WhenPriceNotFound() throws Exception {
        when(priceRepositoryPort.findLatestByAssetId("UNKNOWN")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/prices/UNKNOWN/latest"))
                .andExpect(status().isNotFound());
    }
}
