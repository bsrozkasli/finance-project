package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.FinnhubClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubPriceTargetDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubRecommendationDto;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
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

@WebMvcTest(controllers = AnalystController.class)
class AnalystControllerTest {

    private static final String BASE_PATH = "/api/v1/analyst";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FinnhubClient finnhubClient;

    @Test
    void shouldReturnRecommendations200AndPreserveOrderFieldsAndUppercaseSymbol() throws Exception {
        FinnhubRecommendationDto first = recommendation("2026-05-01", 11, 18, 9, 2, 1);
        FinnhubRecommendationDto second = recommendation("2026-06-01", 12, 17, 8, 3, 2);
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of(first, second));

        mockMvc.perform(get(BASE_PATH + "/aapl/recommendations").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$[0].period").value("2026-05-01"))
                .andExpect(jsonPath("$[0].strongBuy").value(11))
                .andExpect(jsonPath("$[0].buy").value(18))
                .andExpect(jsonPath("$[0].hold").value(9))
                .andExpect(jsonPath("$[0].sell").value(2))
                .andExpect(jsonPath("$[0].strongSell").value(1))
                .andExpect(jsonPath("$[1].period").value("2026-06-01"))
                .andExpect(jsonPath("$[1].strongBuy").value(12))
                .andExpect(jsonPath("$[1].strongSell").value(2));

        ArgumentCaptor<String> symbolCaptor = ArgumentCaptor.forClass(String.class);
        verify(finnhubClient).getRecommendations(symbolCaptor.capture());
        assertThat(symbolCaptor.getValue()).isEqualTo("AAPL");
        verifyNoMoreInteractions(finnhubClient);
    }

    @Test
    void shouldReturn200EmptyArrayWhenRecommendationsProviderReturnsEmptyList() throws Exception {
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL/recommendations").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string("[]"));

        verify(finnhubClient).getRecommendations("AAPL");
        verifyNoMoreInteractions(finnhubClient);
    }

    @Test
    void shouldTreatNullRecommendationListAsEmptyArrayByContract() throws Exception {
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(null);

        mockMvc.perform(get(BASE_PATH + "/AAPL/recommendations").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string("[]"));

        verify(finnhubClient).getRecommendations("AAPL");
        verifyNoMoreInteractions(finnhubClient);
    }

    @Test
    void shouldDegradeGracefullyWhenRecommendationProviderThrows() throws Exception {
        when(finnhubClient.getRecommendations("AAPL"))
                .thenThrow(new RuntimeException("provider unavailable"));

        mockMvc.perform(get(BASE_PATH + "/AAPL/recommendations").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string("[]"));

        verify(finnhubClient).getRecommendations("AAPL");
        verifyNoMoreInteractions(finnhubClient);
    }

    @Test
    void shouldReturnPriceTarget200AndPreserveNumericFieldsAndUppercaseSymbol() throws Exception {
        FinnhubPriceTargetDto dto = priceTarget("AAPL", 260.0, 180.0, 220.0, 215.0, "2026-07-01", 39);
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(dto);

        mockMvc.perform(get(BASE_PATH + "/aapl/price-target").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.targetHigh").value(260.0))
                .andExpect(jsonPath("$.targetLow").value(180.0))
                .andExpect(jsonPath("$.targetMean").value(220.0))
                .andExpect(jsonPath("$.targetMedian").value(215.0))
                .andExpect(jsonPath("$.lastUpdated").value("2026-07-01"))
                .andExpect(jsonPath("$.numberOfAnalysts").value(39));

        ArgumentCaptor<String> symbolCaptor = ArgumentCaptor.forClass(String.class);
        verify(finnhubClient).getPriceTarget(symbolCaptor.capture());
        assertThat(symbolCaptor.getValue()).isEqualTo("AAPL");
        verifyNoMoreInteractions(finnhubClient);
    }

    @Test
    void shouldDocumentNullPriceTargetBehaviorWithoutFabrication() throws Exception {
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(null);

        String body = mockMvc.perform(get(BASE_PATH + "/AAPL/price-target").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(body).isIn("", "null");
        assertThat(body).doesNotContain("targetHigh");
        assertThat(body).doesNotContain("targetLow");

        verify(finnhubClient).getPriceTarget("AAPL");
        verifyNoMoreInteractions(finnhubClient);
    }

    @Test
    void shouldDegradeGracefullyWhenPriceTargetProviderThrows() throws Exception {
        when(finnhubClient.getPriceTarget("AAPL"))
                .thenThrow(new RuntimeException("provider unavailable"));

        mockMvc.perform(get(BASE_PATH + "/AAPL/price-target").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string("null"));

        verify(finnhubClient).getPriceTarget("AAPL");
        verifyNoMoreInteractions(finnhubClient);
    }

    @Test
    void shouldExposeAnalystCacheAnnotationsAndKeyPrefixesWithWhitespaceRisk() throws Exception {
        Cacheable rec = AnalystController.class
                .getMethod("getRecommendations", String.class)
                .getAnnotation(Cacheable.class);
        Cacheable pt = AnalystController.class
                .getMethod("getPriceTarget", String.class)
                .getAnnotation(Cacheable.class);

        assertThat(rec).isNotNull();
        assertThat(rec.value()).containsExactly("analystCache");
        assertThat(rec.key()).isEqualTo("'rec:' + #symbol.toUpperCase()");

        assertThat(pt).isNotNull();
        assertThat(pt.value()).containsExactly("analystCache");
        assertThat(pt.key()).isEqualTo("'pt:' + #symbol.toUpperCase()");
    }

    @Test
    void shouldDelegateWhitespaceSymbolUppercasedWithoutTrimming() throws Exception {
        when(finnhubClient.getRecommendations(" AAPL ")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/{symbol}/recommendations", " aapl ").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string("[]"));

        verify(finnhubClient).getRecommendations(" AAPL ");
        verifyNoMoreInteractions(finnhubClient);
    }

    @Test
    void shouldRejectUnsupportedRoutesAndHttpMethods() throws Exception {
        mockMvc.perform(post(BASE_PATH + "/AAPL/recommendations")).andExpect(status().is4xxClientError());
        mockMvc.perform(put(BASE_PATH + "/AAPL/price-target")).andExpect(status().is4xxClientError());
        mockMvc.perform(delete(BASE_PATH + "/AAPL/recommendations")).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PATH)).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PATH + "/AAPL")).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PATH + "/AAPL/recommendations/extra")).andExpect(status().is4xxClientError());

        verify(finnhubClient, never()).getRecommendations(org.mockito.ArgumentMatchers.anyString());
        verify(finnhubClient, never()).getPriceTarget(org.mockito.ArgumentMatchers.anyString());
        verifyNoMoreInteractions(finnhubClient);
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

        verifyNoMoreInteractions(finnhubClient);
    }

    @Test
    void shouldClarifyPriceTargetNullShapeContract() {
    }

    private FinnhubRecommendationDto recommendation(
            String period,
            int strongBuy,
            int buy,
            int hold,
            int sell,
            int strongSell
    ) {
        FinnhubRecommendationDto dto = new FinnhubRecommendationDto();
        dto.setPeriod(period);
        dto.setStrongBuy(strongBuy);
        dto.setBuy(buy);
        dto.setHold(hold);
        dto.setSell(sell);
        dto.setStrongSell(strongSell);
        return dto;
    }

    private FinnhubPriceTargetDto priceTarget(
            String symbol,
            Double high,
            Double low,
            Double mean,
            Double median,
            String lastUpdated,
            Integer numberOfAnalysts
    ) {
        FinnhubPriceTargetDto dto = new FinnhubPriceTargetDto();
        dto.setSymbol(symbol);
        dto.setTargetHigh(high);
        dto.setTargetLow(low);
        dto.setTargetMean(mean);
        dto.setTargetMedian(median);
        dto.setLastUpdated(lastUpdated);
        dto.setNumberOfAnalysts(numberOfAnalysts);
        return dto;
    }
}


