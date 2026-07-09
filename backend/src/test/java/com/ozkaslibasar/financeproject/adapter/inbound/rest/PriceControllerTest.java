package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper.RestMapper;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = PriceController.class,
        includeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = RestMapper.class
        )
)
class PriceControllerTest {

    private static final Instant CANDLE_TIME = Instant.parse("2026-06-26T20:00:00Z");
    private static final String BASE_PRICES_PATH = "/api/v1/prices";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PriceRefreshService priceRefreshService;

    @MockitoSpyBean
    private RestMapper restMapper;

    @Test
    void shouldReturnCompleteLatestPriceContract() throws Exception {
        when(priceRefreshService.getFreshLatest("AAPL"))
                .thenReturn(Optional.of(candle("AAPL", "190.12000000", "193.42000000", "194.25000000", "189.50000000", "53120000", CANDLE_TIME)));

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/latest").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$.assetId").value("AAPL"))
                .andExpect(jsonPath("$.open").value(190.12))
                .andExpect(jsonPath("$.high").value(194.25))
                .andExpect(jsonPath("$.low").value(189.5))
                .andExpect(jsonPath("$.close").value(193.42))
                .andExpect(jsonPath("$.volume").value(53120000))
                .andExpect(jsonPath("$.timestamp").value("2026-06-26T20:00:00Z"))
                .andExpect(jsonPath("$.symbol").doesNotExist())
                .andExpect(jsonPath("$.ticker").doesNotExist())
                .andExpect(jsonPath("$.asset").doesNotExist())
                .andExpect(jsonPath("$.date").doesNotExist())
                .andExpect(jsonPath("$.time").doesNotExist());

        verify(priceRefreshService, times(1)).getFreshLatest("AAPL");
        verify(restMapper, times(1)).toPriceResponseDto(any(PriceHistory.class));
    }

    @Test
    void shouldNormalizeLowercaseAndMixedCaseSymbolBeforeDelegatingLatest() throws Exception {
        when(priceRefreshService.getFreshLatest("AAPL"))
                .thenReturn(Optional.of(candle("AAPL", "1", "1", "1", "1", "1", CANDLE_TIME)));

        mockMvc.perform(get(BASE_PRICES_PATH + "/aapl/latest")).andExpect(status().isOk());
        mockMvc.perform(get(BASE_PRICES_PATH + "/AaPl/latest")).andExpect(status().isOk());

        verify(priceRefreshService, times(2)).getFreshLatest("AAPL");
    }

    @Test
    void shouldDelegateWhitespaceSymbolAsUppercaseWithoutTrimming() throws Exception {
        when(priceRefreshService.getFreshLatest(" AAPL "))
                .thenReturn(Optional.of(candle("AAPL", "1", "1", "1", "1", "1", CANDLE_TIME)));

        mockMvc.perform(get(BASE_PRICES_PATH + "/{symbol}/latest", " aapl "))
                .andExpect(status().isOk());

        verify(priceRefreshService).getFreshLatest(" AAPL ");
    }

    @Test
    void shouldReturn404WhenLatestPriceDoesNotExist() throws Exception {
        when(priceRefreshService.getFreshLatest("AAPL")).thenReturn(Optional.empty());

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/latest").accept(APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Price not found"));

        verify(priceRefreshService).getFreshLatest("AAPL");
        verify(restMapper, never()).toPriceResponseDto(any(PriceHistory.class));
    }

    @Test
    void shouldReturnStableErrorShapeWhenLatestPriceDoesNotExist() throws Exception {
        when(priceRefreshService.getFreshLatest("AAPL")).thenReturn(Optional.empty());

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/latest").accept(APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Price not found"))
                .andExpect(jsonPath("$.path").value("/api/v1/prices/AAPL/latest"));
    }

    @Test
    void shouldMapLatestServiceValidationFailureTo400() throws Exception {
        when(priceRefreshService.getFreshLatest("AAPL"))
                .thenThrow(new IllegalArgumentException("symbol must not be blank"));

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/latest").accept(APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        verify(restMapper, never()).toPriceResponseDto(any(PriceHistory.class));
    }

    @Test
    void shouldMapLatestDependencyFailureTo503() throws Exception {
        when(priceRefreshService.getFreshLatest("AAPL"))
                .thenThrow(new RuntimeException("Price data unavailable"));

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/latest").accept(APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable());

        verify(restMapper, never()).toPriceResponseDto(any(PriceHistory.class));
    }

    @Test
    void shouldMapLatestMapperFailureTo500() throws Exception {
        when(priceRefreshService.getFreshLatest("AAPL"))
                .thenReturn(Optional.of(candle("AAPL", "190.12000000", "193.42000000", "194.25000000", "189.50000000", "53120000", CANDLE_TIME)));
        doThrow(new RuntimeException("mapping failed"))
                .when(restMapper).toPriceResponseDto(any(PriceHistory.class));

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/latest").accept(APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        verify(priceRefreshService).getFreshLatest("AAPL");
    }

    @Test
    void shouldReturnHistoryArrayAndPreserveOrderAndContractFields() throws Exception {
        PriceHistory first = candle("AAPL", "190.12000000", "193.42000000", "194.25000000", "189.50000000", "53120000", Instant.parse("2026-06-25T20:00:00Z"));
        PriceHistory second = candle("AAPL", "191.12000000", "194.42000000", "195.25000000", "190.50000000", "54120000", Instant.parse("2026-06-26T20:00:00Z"));

        when(priceRefreshService.getFreshHistory("AAPL", "1d", "1mo")).thenReturn(List.of(first, second));

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history?interval=1d&range=1mo").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$[0].assetId").value("AAPL"))
                .andExpect(jsonPath("$[0].open").value(190.12))
                .andExpect(jsonPath("$[0].high").value(194.25))
                .andExpect(jsonPath("$[0].low").value(189.5))
                .andExpect(jsonPath("$[0].close").value(193.42))
                .andExpect(jsonPath("$[0].volume").value(53120000))
                .andExpect(jsonPath("$[0].timestamp").value("2026-06-25T20:00:00Z"))
                .andExpect(jsonPath("$[1].assetId").value("AAPL"))
                .andExpect(jsonPath("$[1].open").value(191.12))
                .andExpect(jsonPath("$[1].high").value(195.25))
                .andExpect(jsonPath("$[1].low").value(190.5))
                .andExpect(jsonPath("$[1].close").value(194.42))
                .andExpect(jsonPath("$[1].volume").value(54120000))
                .andExpect(jsonPath("$[1].timestamp").value("2026-06-26T20:00:00Z"))
                .andExpect(jsonPath("$[0].symbol").doesNotExist())
                .andExpect(jsonPath("$[0].ticker").doesNotExist())
                .andExpect(jsonPath("$[0].asset").doesNotExist())
                .andExpect(jsonPath("$[0].date").doesNotExist())
                .andExpect(jsonPath("$[0].time").doesNotExist())
                .andExpect(jsonPath("$.content").doesNotExist())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.prices").doesNotExist());

        verify(priceRefreshService).getFreshHistory("AAPL", "1d", "1mo");
        verify(restMapper, times(1)).toPriceResponseDtoList(eq(List.of(first, second)));
    }

    @Test
    void shouldNormalizeLowercaseAndMixedCaseSymbolBeforeDelegatingHistory() throws Exception {
        when(priceRefreshService.getFreshHistory("AAPL", "1d", "1mo")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PRICES_PATH + "/aapl/history")).andExpect(status().isOk());
        mockMvc.perform(get(BASE_PRICES_PATH + "/AaPl/history")).andExpect(status().isOk());

        verify(priceRefreshService, times(2)).getFreshHistory("AAPL", "1d", "1mo");
    }

    @Test
    void shouldApplyDefaultHistoryQueryParametersWhenMissing() throws Exception {
        when(priceRefreshService.getFreshHistory("AAPL", "1d", "1mo")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(priceRefreshService).getFreshHistory("AAPL", "1d", "1mo");
    }

    @Test
    void shouldApplyDefaultHistoryQueryParametersWhenEmpty() throws Exception {
        when(priceRefreshService.getFreshHistory("AAPL", "1d", "1mo")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history?interval=&range="))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(priceRefreshService).getFreshHistory("AAPL", "1d", "1mo");
    }

    @Test
    void shouldDelegateExplicitHistoryParametersWithoutControllerComputation() throws Exception {
        when(priceRefreshService.getFreshHistory(eq("AAPL"), any(), any())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history?interval=1d&range=5d"))
                .andExpect(status().isOk());
        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history?interval=1d&range=3mo"))
                .andExpect(status().isOk());
        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history?interval=1h&range=5d"))
                .andExpect(status().isOk());
        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history?interval=15m&range=1mo"))
                .andExpect(status().isOk());

        ArgumentCaptor<String> intervalCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> rangeCaptor = ArgumentCaptor.forClass(String.class);
        verify(priceRefreshService, times(4)).getFreshHistory(eq("AAPL"), intervalCaptor.capture(), rangeCaptor.capture());

        assertThat(intervalCaptor.getAllValues()).containsExactly("1d", "1d", "1h", "15m");
        assertThat(rangeCaptor.getAllValues()).containsExactly("5d", "3mo", "5d", "1mo");
    }

    @Test
    void shouldDelegateUnknownIntervalAndRangeWithoutCrash() throws Exception {
        when(priceRefreshService.getFreshHistory("AAPL", "unknown", "unknown")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history?interval=unknown&range=unknown"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(priceRefreshService).getFreshHistory("AAPL", "unknown", "unknown");
    }

    @Test
    void shouldDelegateWhitespaceIntervalAndRangeAsProvided() throws Exception {
        when(priceRefreshService.getFreshHistory("AAPL", "   ", "   ")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history").param("interval", "   ").param("range", "   "))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(priceRefreshService).getFreshHistory("AAPL", "   ", "   ");
    }

    @Test
    void shouldReturnEmptyArrayWhenHistoryIsEmpty() throws Exception {
        when(priceRefreshService.getFreshHistory("AAPL", "1d", "1mo")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history?interval=1d&range=1mo").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(priceRefreshService).getFreshHistory("AAPL", "1d", "1mo");
        verify(restMapper, times(1)).toPriceResponseDtoList(eq(List.of()));
    }

    @Test
    void shouldMapHistoryValidationFailureTo400() throws Exception {
        when(priceRefreshService.getFreshHistory("AAPL", "1d", "1mo"))
                .thenThrow(new IllegalArgumentException("symbol must not be blank"));

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history?interval=1d&range=1mo").accept(APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        verify(priceRefreshService).getFreshHistory("AAPL", "1d", "1mo");
        verify(restMapper, never()).toPriceResponseDtoList(any());
    }

    @Test
    void shouldMapHistoryDependencyFailureTo503() throws Exception {
        when(priceRefreshService.getFreshHistory("AAPL", "1d", "1mo"))
                .thenThrow(new RuntimeException("Price data unavailable"));

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history?interval=1d&range=1mo").accept(APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable());

        verify(priceRefreshService).getFreshHistory("AAPL", "1d", "1mo");
        verify(restMapper, never()).toPriceResponseDtoList(any());
    }

    @Test
    void shouldReturnStableErrorShapeWhenHistoryDependencyFails() throws Exception {
        when(priceRefreshService.getFreshHistory("AAPL", "1d", "1mo"))
                .thenThrow(new RuntimeException("Price data unavailable"));

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/history?interval=1d&range=1mo").accept(APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.error").value("Service Unavailable"))
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.path").value("/api/v1/prices/AAPL/history"));
    }

    @Test
    void shouldRejectUnsupportedHttpMethodsForLatestAndHistory() throws Exception {
        mockMvc.perform(post(BASE_PRICES_PATH + "/AAPL/latest")).andExpect(status().isMethodNotAllowed());
        mockMvc.perform(put(BASE_PRICES_PATH + "/AAPL/history")).andExpect(status().isMethodNotAllowed());
        mockMvc.perform(delete(BASE_PRICES_PATH + "/AAPL/latest")).andExpect(status().isMethodNotAllowed());

        verifyNoMoreInteractions(priceRefreshService);
    }

    @Test
    void shouldNotResolveInvalidPriceRoutesAsSuccessful() throws Exception {
        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL")).andExpect(status().isNotFound());
        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/unknown")).andExpect(status().isNotFound());
        mockMvc.perform(get(BASE_PRICES_PATH + "//latest")).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/latest/extra")).andExpect(status().isNotFound());
    }

    @Test
    void shouldSupportJsonContentNegotiation() throws Exception {
        when(priceRefreshService.getFreshLatest("AAPL"))
                .thenReturn(Optional.of(candle("AAPL", "1", "1", "1", "1", "1", CANDLE_TIME)));

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/latest").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON));

        verify(priceRefreshService).getFreshLatest("AAPL");
    }

    @Test
    void shouldRejectUnsupportedAcceptTypeForLatest() throws Exception {
        when(priceRefreshService.getFreshLatest("AAPL"))
                .thenReturn(Optional.of(candle("AAPL", "1", "1", "1", "1", "1", CANDLE_TIME)));

        mockMvc.perform(get(BASE_PRICES_PATH + "/AAPL/latest").accept("text/csv"))
                .andExpect(status().isNotAcceptable());
    }

    @Test
    void shouldExposeExpectedCacheAnnotationsForLatestAndHistory() throws Exception {
        var latest = PriceController.class.getMethod("getLatestPrice", String.class);
        var history = PriceController.class.getMethod("getPriceHistory", String.class, String.class, String.class);

        var latestCache = latest.getAnnotation(org.springframework.cache.annotation.Cacheable.class);
        var historyCache = history.getAnnotation(org.springframework.cache.annotation.Cacheable.class);

        assertThat(latestCache).isNotNull();
        assertThat(historyCache).isNotNull();
        assertThat(latestCache.value()).containsExactly("priceCache");
        assertThat(historyCache.value()).containsExactly("priceCache");
        assertThat(latestCache.key()).contains("latest:");
        assertThat(historyCache.key()).contains("hist:").contains("#interval").contains("#range");
    }

    @Test
    void shouldClarifyNullHistoryCollectionContract() {
    }

    @Test
    void shouldClarifyGlobalOwnershipOfStableErrorSchemaMigration() {
    }

    private PriceHistory candle(String symbol, String open, String close, String high, String low, String volume, Instant ts) {
        return new PriceHistory(
                symbol,
                new BigDecimal(open),
                new BigDecimal(close),
                new BigDecimal(high),
                new BigDecimal(low),
                new BigDecimal(volume),
                ts
        );
    }
}
