package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.ExposureStatus;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioState;
import com.ozkaslibasar.financeproject.domain.model.PortfolioStatePosition;
import com.ozkaslibasar.financeproject.domain.model.PositionValuationStatus;
import com.ozkaslibasar.financeproject.domain.model.ValuationInput;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioStateMismatchException;
import com.ozkaslibasar.financeproject.domain.service.PortfolioStateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PortfolioStateController.class)
@Import(PortfolioStateControllerTest.FixedClock.class)
class PortfolioStateControllerTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 25);
    private static final String VERSION = "pstate-v2:abc";

    @TestConfiguration
    static class FixedClock {
        @Bean
        Clock clock() {
            return Clock.fixed(Instant.parse("2026-10-25T23:59:59Z"), ZoneOffset.UTC);
        }
    }

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private PortfolioPort portfolioPort;
    @MockitoBean
    private PortfolioStateService stateService;

    @BeforeEach
    void portfolioExists() {
        when(portfolioPort.findByIdAndUserId(1L, "default"))
                .thenReturn(Optional.of(new Portfolio(1L, "default", "P", "USD", null, false, null, null)));
    }

    private static PortfolioState state(boolean priced) {
        Map<String, BigDecimal> weights = new LinkedHashMap<>();
        PortfolioStatePosition open = priced
                ? new PortfolioStatePosition("AAPL", PortfolioAssetType.US_STOCK, new BigDecimal("6"),
                new BigDecimal("100"), new BigDecimal("600"), new BigDecimal("200"), "USD",
                PositionValuationStatus.PRICED, new BigDecimal("110"), LocalDate.of(2026, 10, 20),
                new BigDecimal("660"), new BigDecimal("1.0000000000"))
                : new PortfolioStatePosition("AAPL", PortfolioAssetType.US_STOCK, new BigDecimal("6"),
                new BigDecimal("100"), new BigDecimal("600"), new BigDecimal("200"), "USD",
                PositionValuationStatus.NO_PRICE, null, null, null, null);
        if (priced) {
            weights.put("US_STOCK", new BigDecimal("1.0000000000"));
        }
        return new PortfolioState(VERSION, 1L, "default", TODAY, "USD",
                priced ? ExposureStatus.COMPLETE : ExposureStatus.PARTIAL, List.of(1L, 2L), List.of(open), weights,
                List.of(new ValuationInput("AAPL", priced ? new BigDecimal("110") : null,
                        priced ? LocalDate.of(2026, 10, 20) : null, "USD")));
    }

    @Test
    void postCreatesANewStateWith201AndTheExactFields() throws Exception {
        when(stateService.create(1L, "default", TODAY))
                .thenReturn(new PortfolioStateService.CreatedState(state(true), true));

        mockMvc.perform(post("/api/v1/portfolios/1/states").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"asOf\":\"2026-10-25\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.version").value(VERSION))
                .andExpect(jsonPath("$.portfolioId").value(1))
                .andExpect(jsonPath("$.asOf").value("2026-10-25"))
                .andExpect(jsonPath("$.exposureStatus").value("COMPLETE"))
                .andExpect(jsonPath("$.sourceEventIds[0]").value(1))
                .andExpect(jsonPath("$.sourceEventIds[1]").value(2))
                .andExpect(jsonPath("$.positions[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$.positions[0].assetType").value("US_STOCK"))
                .andExpect(jsonPath("$.positions[0].quantity").value(6))
                .andExpect(jsonPath("$.positions[0].averageCost").value(100))
                .andExpect(jsonPath("$.positions[0].costBasis").value(600))
                .andExpect(jsonPath("$.positions[0].realizedPnl").value(200))
                .andExpect(jsonPath("$.positions[0].currency").value("USD"))
                .andExpect(jsonPath("$.positions[0].valuationStatus").value("PRICED"))
                .andExpect(jsonPath("$.positions[0].price").value(110))
                .andExpect(jsonPath("$.positions[0].priceDate").value("2026-10-20"))
                .andExpect(jsonPath("$.positions[0].marketValue").value(660))
                .andExpect(jsonPath("$.positions[0].weight").value(1.0))
                .andExpect(jsonPath("$.assetTypeWeights.US_STOCK").value(1.0));
    }

    @Test
    void postOfAnExistingVersionReturns200() throws Exception {
        when(stateService.create(1L, "default", TODAY))
                .thenReturn(new PortfolioStateService.CreatedState(state(true), false));

        mockMvc.perform(post("/api/v1/portfolios/1/states").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"asOf\":\"2026-10-25\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(VERSION));
    }

    @Test
    void absentValuesAreNullAndNeverZeroAndWeightsAreAnEmptyObject() throws Exception {
        when(stateService.create(1L, "default", TODAY))
                .thenReturn(new PortfolioStateService.CreatedState(state(false), true));

        mockMvc.perform(post("/api/v1/portfolios/1/states").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"asOf\":\"2026-10-25\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.exposureStatus").value("PARTIAL"))
                .andExpect(jsonPath("$.positions[0].valuationStatus").value("NO_PRICE"))
                .andExpect(jsonPath("$.positions[0].price").value(nullValue()))
                .andExpect(jsonPath("$.positions[0].priceDate").value(nullValue()))
                .andExpect(jsonPath("$.positions[0].marketValue").value(nullValue()))
                .andExpect(jsonPath("$.positions[0].weight").value(nullValue()))
                .andExpect(content().string(containsString("\"price\":null")))
                .andExpect(content().string(containsString("\"priceDate\":null")))
                .andExpect(content().string(containsString("\"marketValue\":null")))
                .andExpect(content().string(containsString("\"weight\":null")))
                .andExpect(jsonPath("$.assetTypeWeights").isMap())
                .andExpect(jsonPath("$.assetTypeWeights").isEmpty());
    }

    private static PortfolioState withScales(String quantity, String price, String marketValue, String weight) {
        PortfolioStatePosition open = new PortfolioStatePosition("AAPL", PortfolioAssetType.US_STOCK,
                new BigDecimal(quantity), new BigDecimal("100.00"), new BigDecimal("600.0000"),
                new BigDecimal("0.000"), "USD", PositionValuationStatus.PRICED, new BigDecimal(price),
                LocalDate.of(2026, 10, 20), new BigDecimal(marketValue), new BigDecimal(weight));
        Map<String, BigDecimal> weights = new LinkedHashMap<>();
        weights.put("US_STOCK", new BigDecimal(weight));
        return new PortfolioState(VERSION, 1L, "default", TODAY, "USD", ExposureStatus.COMPLETE, List.of(1L),
                List.of(open), weights, List.of(new ValuationInput("AAPL", new BigDecimal(price),
                LocalDate.of(2026, 10, 20), "USD")));
    }

    @Test
    void createAndReplayBodiesAreIdenticalDespiteDifferentNumericScales() throws Exception {
        // POST carries freshly derived scales; GET carries the stored (wider) ones. Same state, same JSON.
        when(stateService.create(1L, "default", TODAY)).thenReturn(new PortfolioStateService.CreatedState(
                withScales("6", "110.0000", "660.000000000000", "1.0000000000"), true));
        when(stateService.replay(1L, "default", VERSION)).thenReturn(Optional.of(
                withScales("6.00000000", "110.00000000", "660.0000000000000000", "1")));

        String created = mockMvc.perform(post("/api/v1/portfolios/1/states").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"asOf\":\"2026-10-25\"}"))
                .andReturn().getResponse().getContentAsString();
        String replayed = mockMvc.perform(get("/api/v1/portfolios/1/states/" + VERSION))
                .andReturn().getResponse().getContentAsString();

        org.assertj.core.api.Assertions.assertThat(replayed).isEqualTo(created);
        org.assertj.core.api.Assertions.assertThat(created)
                .contains("\"price\":110,").contains("\"marketValue\":660,").contains("\"weight\":1}")
                .contains("\"realizedPnl\":0,").contains("\"averageCost\":100,");
    }

    @Test
    void decimalsNeverUseExponentNotation() throws Exception {
        when(stateService.create(1L, "default", TODAY)).thenReturn(new PortfolioStateService.CreatedState(
                withScales("1E+3", "0.00000001", "1E+8", "0.5"), true));

        String body = mockMvc.perform(post("/api/v1/portfolios/1/states").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"asOf\":\"2026-10-25\"}"))
                .andReturn().getResponse().getContentAsString();

        org.assertj.core.api.Assertions.assertThat(body)
                .contains("\"quantity\":1000,").contains("\"price\":0.00000001,").contains("\"marketValue\":100000000,")
                .doesNotContain("E+").doesNotContain("E-");
    }

    @Test
    void assetTypeWeightsKeysAreEmittedInSortedOrder() throws Exception {
        Map<String, BigDecimal> weights = new LinkedHashMap<>();
        weights.put("US_STOCK", new BigDecimal("0.5"));
        weights.put("CRYPTO", new BigDecimal("0.25"));
        weights.put("ETF", new BigDecimal("0.25"));
        PortfolioState base = state(true);
        PortfolioState mixed = new PortfolioState(base.version(), base.portfolioId(), base.userId(), base.asOf(),
                base.baseCurrency(), base.exposureStatus(), base.sourceEventIds(), base.positions(), weights,
                base.valuationInputs());
        when(stateService.create(1L, "default", TODAY))
                .thenReturn(new PortfolioStateService.CreatedState(mixed, true));

        String body = mockMvc.perform(post("/api/v1/portfolios/1/states").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"asOf\":\"2026-10-25\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String section = body.substring(body.indexOf("\"assetTypeWeights\""));
        org.assertj.core.api.Assertions.assertThat(section.indexOf("CRYPTO"))
                .isLessThan(section.indexOf("ETF"));
        org.assertj.core.api.Assertions.assertThat(section.indexOf("ETF"))
                .isLessThan(section.indexOf("US_STOCK"));
    }

    @Test
    void asOfTodayInUtcIsAcceptedAndTomorrowIsRejected() throws Exception {
        when(stateService.create(1L, "default", TODAY))
                .thenReturn(new PortfolioStateService.CreatedState(state(true), true));

        mockMvc.perform(post("/api/v1/portfolios/1/states").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"asOf\":\"2026-10-25\"}"))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/portfolios/1/states").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"asOf\":\"2026-10-26\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void missingInvalidOrEmptyAsOfIsRejectedWith400() throws Exception {
        for (String body : List.of("{}", "{\"asOf\":null}", "{\"asOf\":\"not-a-date\"}", "{\"asOf\":\"2026-13-40\"}",
                "")) {
            mockMvc.perform(post("/api/v1/portfolios/1/states").contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
        verify(stateService, never()).create(any(), any(), any());
    }

    @Test
    void postForAnUnknownPortfolioReturns404() throws Exception {
        mockMvc.perform(post("/api/v1/portfolios/9/states").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"asOf\":\"2026-10-25\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
        verify(stateService, never()).create(any(), any(), any());
    }

    @Test
    void getReplaysAStoredVersion() throws Exception {
        when(stateService.replay(1L, "default", VERSION)).thenReturn(Optional.of(state(true)));

        mockMvc.perform(get("/api/v1/portfolios/1/states/" + VERSION))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(VERSION))
                .andExpect(jsonPath("$.sourceEventIds", contains(1, 2)));
    }

    @Test
    void getOfAnUnknownVersionOrPortfolioReturns404() throws Exception {
        when(stateService.replay(1L, "default", "pstate-v2:none")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/portfolios/1/states/pstate-v2:none")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/portfolios/9/states/" + VERSION)).andExpect(status().isNotFound());
    }

    @Test
    void aReplayMismatchReturns409WithTheStandardErrorBody() throws Exception {
        when(stateService.replay(1L, "default", VERSION))
                .thenThrow(new PortfolioStateMismatchException("replayed to a different version"));

        mockMvc.perform(get("/api/v1/portfolios/1/states/" + VERSION))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value("replayed to a different version"))
                .andExpect(jsonPath("$.path").value("/api/v1/portfolios/1/states/" + VERSION));
    }
}
