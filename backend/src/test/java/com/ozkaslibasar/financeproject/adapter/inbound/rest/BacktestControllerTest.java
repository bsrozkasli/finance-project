package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice.DataServiceBacktestAdapter;
import com.ozkaslibasar.financeproject.domain.model.BacktestResult;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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

@WebMvcTest(controllers = BacktestController.class)
class BacktestControllerTest {

    private static final String BASE_PATH = "/api/v1/backtest";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DataServiceBacktestAdapter backtestAdapter;

    @Test
    void shouldReturn200AndPreserveBacktestFieldsAndDelegateExactlyOnce() throws Exception {
        BacktestResult result = BacktestResult.builder()
                .symbol("AAPL")
                .currentRsi(28.5)
                .scenarioDescription("RSI crossed below 30 and recovered within 10 sessions")
                .totalOccurrences(14)
                .winRate(64.3)
                .averageReturnPct(3.8)
                .isMeaningful(true)
                .build();
        when(backtestAdapter.getBacktest("AAPL")).thenReturn(result);

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.currentRsi").value(28.5))
                .andExpect(jsonPath("$.scenarioDescription").value("RSI crossed below 30 and recovered within 10 sessions"))
                .andExpect(jsonPath("$.totalOccurrences").value(14))
                .andExpect(jsonPath("$.winRate").value(64.3))
                .andExpect(jsonPath("$.averageReturnPct").value(3.8))
                .andExpect(jsonPath("$.meaningful").value(true))
                .andExpect(jsonPath("$.response").doesNotExist())
                .andExpect(jsonPath("$.data").doesNotExist());

        verify(backtestAdapter, times(1)).getBacktest("AAPL");
        verifyNoMoreInteractions(backtestAdapter);
    }

    @Test
    void shouldDocumentLowercaseAndMixedCaseDelegationBehavior() throws Exception {
        when(backtestAdapter.getBacktest("aapl")).thenReturn(minimalResult("aapl"));
        when(backtestAdapter.getBacktest("AaPl")).thenReturn(minimalResult("AaPl"));

        mockMvc.perform(get(BASE_PATH + "/aapl").accept(APPLICATION_JSON))
                .andExpect(status().isOk());
        mockMvc.perform(get(BASE_PATH + "/AaPl").accept(APPLICATION_JSON))
                .andExpect(status().isOk());

        ArgumentCaptor<String> symbolCaptor = ArgumentCaptor.forClass(String.class);
        verify(backtestAdapter, times(2)).getBacktest(symbolCaptor.capture());
        assertThat(symbolCaptor.getAllValues()).containsExactly("aapl", "AaPl");
        verifyNoMoreInteractions(backtestAdapter);
    }

    @Test
    void shouldRejectBlankAndMalformedSymbolsByContractWithoutDelegation() throws Exception {
        List<String> acceptedStatuses = new ArrayList<>();

        int blankStatus = mockMvc.perform(get(BASE_PATH + "/{symbol}", "   ").accept(APPLICATION_JSON))
                .andReturn()
                .getResponse()
                .getStatus();
        int malformedStatus = mockMvc.perform(get(BASE_PATH + "/{symbol}", "$INVALID").accept(APPLICATION_JSON))
                .andReturn()
                .getResponse()
                .getStatus();

        if (blankStatus < 400 || blankStatus >= 500) {
            acceptedStatuses.add("\"   \" -> " + blankStatus);
        }
        if (malformedStatus < 400 || malformedStatus >= 500) {
            acceptedStatuses.add("\"$INVALID\" -> " + malformedStatus);
        }

        assertThat(acceptedStatuses)
                .as("Malformed symbols should be rejected as client errors by API contract")
                .isEmpty();
        verifyNoInteractions(backtestAdapter);
    }

    @Test
    void shouldReturn503WhenAdapterReturnsNullByContract() throws Exception {
        when(backtestAdapter.getBacktest("AAPL")).thenReturn(null);

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().string(not(containsString("Hata oldu"))))
                .andExpect(content().string(not(containsString("Could not"))));

        verify(backtestAdapter).getBacktest("AAPL");
        verifyNoMoreInteractions(backtestAdapter);
    }

    @Test
    void shouldReturn503WhenAdapterThrowsDependencyExceptionByContract() throws Exception {
        when(backtestAdapter.getBacktest("AAPL")).thenThrow(new RuntimeException("data-service unavailable"));

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().string(not(containsString("java.lang"))))
                .andExpect(content().string(not(containsString("RuntimeException"))))
                .andExpect(content().string(not(containsString("DB_PASSWORD"))))
                .andExpect(content().string(not(containsString("AZURE_OPENAI"))));

        verify(backtestAdapter).getBacktest("AAPL");
        verifyNoMoreInteractions(backtestAdapter);
    }

    @Test
    void shouldRejectUnsupportedRoutesAndHttpMethods() throws Exception {
        mockMvc.perform(post(BASE_PATH + "/AAPL")).andExpect(status().is4xxClientError());
        mockMvc.perform(put(BASE_PATH + "/AAPL")).andExpect(status().is4xxClientError());
        mockMvc.perform(delete(BASE_PATH + "/AAPL")).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PATH)).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PATH + "/AAPL/extra")).andExpect(status().is4xxClientError());

        verify(backtestAdapter, never()).getBacktest(org.mockito.ArgumentMatchers.anyString());
        verifyNoMoreInteractions(backtestAdapter);
    }

    @Test
    void shouldNotExposeSensitiveInternalsOnRepresentativeErrorResponse() throws Exception {
        mockMvc.perform(get(BASE_PATH).accept(APPLICATION_JSON))
                .andExpect(status().is4xxClientError())
                .andExpect(content().string(not(containsString("java.lang"))))
                .andExpect(content().string(not(containsString("Exception"))))
                .andExpect(content().string(not(containsString("SQLException"))))
                .andExpect(content().string(not(containsString("DB_PASSWORD"))))
                .andExpect(content().string(not(containsString("FINNHUB_API_KEY"))))
                .andExpect(content().string(not(containsString("AZURE_OPENAI"))));

        verifyNoInteractions(backtestAdapter);
    }

    @Test
    void shouldClarifyBacktestSymbolNormalizationOwnership() {
    }

    private BacktestResult minimalResult(String symbol) {
        return BacktestResult.builder()
                .symbol(symbol)
                .currentRsi(30.0)
                .scenarioDescription("minimal")
                .totalOccurrences(1)
                .winRate(50.0)
                .averageReturnPct(1.0)
                .isMeaningful(false)
                .build();
    }
}
