package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.EarningsEvent;
import com.ozkaslibasar.financeproject.domain.model.EconomicEvent;
import com.ozkaslibasar.financeproject.domain.model.MacroSnapshot;
import com.ozkaslibasar.financeproject.domain.port.outbound.MarketCalendarPort;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
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

@WebMvcTest(controllers = MarketCalendarController.class)
class MarketCalendarControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MarketCalendarPort marketCalendarPort;

    @Test
    void shouldReturnMacroSnapshotWhenAvailable() throws Exception {
        MacroSnapshot snapshot = new MacroSnapshot(
                BigDecimal.valueOf(5.33),
                BigDecimal.valueOf(315.0),
                BigDecimal.valueOf(3.1),
                BigDecimal.valueOf(2.4),
                BigDecimal.valueOf(4.0),
                BigDecimal.valueOf(4.3),
                BigDecimal.valueOf(4.0),
                BigDecimal.valueOf(0.3),
                "2026-06-01",
                Instant.parse("2026-06-28T10:15:00Z")
        );
        when(marketCalendarPort.fetchMacroSnapshot()).thenReturn(Optional.of(snapshot));

        mockMvc.perform(get("/api/v1/macro/snapshot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fedFundsRate").value(5.33))
                .andExpect(jsonPath("$.yieldCurveSpread").value(0.3));
    }

    @Test
    void shouldReturn503WhenMacroSnapshotUnavailable() throws Exception {
        when(marketCalendarPort.fetchMacroSnapshot()).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/macro/snapshot"))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void shouldReturnEmptyCalendarListsWhenProviderUnavailable() throws Exception {
        when(marketCalendarPort.fetchEarnings(List.of("AAPL"))).thenReturn(List.of());
        when(marketCalendarPort.fetchEconomicEvents()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/calendar/earnings?symbols=AAPL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/v1/calendar/economic-events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void shouldReturnEarningsAndEconomicEvents() throws Exception {
        when(marketCalendarPort.fetchEarnings(List.of())).thenReturn(List.of(
                new EarningsEvent("NVDA", "2026-08-20", BigDecimal.valueOf(1.2), null, null, null, "amc")
        ));
        when(marketCalendarPort.fetchEconomicEvents()).thenReturn(List.of(
                new EconomicEvent("CPI", "2026-07-10", "US", "High", null, null, null)
        ));

        mockMvc.perform(get("/api/v1/calendar/earnings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].symbol").value("NVDA"));

        mockMvc.perform(get("/api/v1/calendar/economic-events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].event").value("CPI"));
    }
}