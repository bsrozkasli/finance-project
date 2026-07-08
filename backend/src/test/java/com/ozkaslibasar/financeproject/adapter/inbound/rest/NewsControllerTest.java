package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.FinnhubClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubNewsDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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

@WebMvcTest(controllers = NewsController.class)
class NewsControllerTest {

    private static final String BASE_PATH = "/api/v1/news";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FinnhubClient finnhubClient;

    @Test
    void shouldReturnNewsArrayAndPreserveProviderOrderAndFields() throws Exception {
        FinnhubNewsDto first = news(1719302400L, "Apple launches AI features", "Summary A", "Reuters", "https://example.com/a", "company", "https://example.com/a.png");
        FinnhubNewsDto second = news(1719388800L, "Apple supplier update", "Summary B", "Bloomberg", "https://example.com/b", "company", "https://example.com/b.png");
        when(finnhubClient.getCompanyNews(anyString(), anyString(), anyString())).thenReturn(List.of(first, second));

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$[0].datetime").value(1719302400L))
                .andExpect(jsonPath("$[0].headline").value("Apple launches AI features"))
                .andExpect(jsonPath("$[0].summary").value("Summary A"))
                .andExpect(jsonPath("$[0].source").value("Reuters"))
                .andExpect(jsonPath("$[0].url").value("https://example.com/a"))
                .andExpect(jsonPath("$[0].category").value("company"))
                .andExpect(jsonPath("$[0].image").value("https://example.com/a.png"))
                .andExpect(jsonPath("$[1].datetime").value(1719388800L))
                .andExpect(jsonPath("$[1].headline").value("Apple supplier update"))
                .andExpect(jsonPath("$.content").doesNotExist())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$[2]").doesNotExist());

        verify(finnhubClient).getCompanyNews(anyString(), anyString(), anyString());
    }

    @Test
    void shouldReturnEmptyArrayWhenProviderReturnsNoNews() throws Exception {
        when(finnhubClient.getCompanyNews(anyString(), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(finnhubClient).getCompanyNews(anyString(), anyString(), anyString());
    }

    @Test
    void shouldClarifyNullProviderResultContract() {
    }

    @ParameterizedTest
    @ValueSource(strings = {"AAPL", "aapl", "AaPl"})
    void shouldNormalizeSymbolToUppercaseBeforeDelegating(String symbol) throws Exception {
        when(finnhubClient.getCompanyNews(anyString(), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/{symbol}", symbol).accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        ArgumentCaptor<String> symbolCaptor = ArgumentCaptor.forClass(String.class);
        verify(finnhubClient).getCompanyNews(symbolCaptor.capture(), anyString(), anyString());
        assertThat(symbolCaptor.getValue()).isEqualTo("AAPL");
    }

    @Test
    void shouldDelegateWhitespaceSymbolWithoutTrimming() throws Exception {
        when(finnhubClient.getCompanyNews(anyString(), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/{symbol}", " aapl ").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        ArgumentCaptor<String> symbolCaptor = ArgumentCaptor.forClass(String.class);
        verify(finnhubClient).getCompanyNews(symbolCaptor.capture(), anyString(), anyString());
        assertThat(symbolCaptor.getValue()).isEqualTo(" AAPL ");
    }

    @Test
    void shouldCalculateSevenDayDateWindowFromRequestTime() throws Exception {
        when(finnhubClient.getCompanyNews(anyString(), anyString(), anyString())).thenReturn(List.of());

        LocalDate before = LocalDate.now();
        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk());
        LocalDate after = LocalDate.now();

        ArgumentCaptor<String> symbolCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> fromCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> toCaptor = ArgumentCaptor.forClass(String.class);
        verify(finnhubClient).getCompanyNews(symbolCaptor.capture(), fromCaptor.capture(), toCaptor.capture());

        assertThat(symbolCaptor.getValue()).isEqualTo("AAPL");
        assertThat(fromCaptor.getValue()).matches("\\d{4}-\\d{2}-\\d{2}");
        assertThat(toCaptor.getValue()).matches("\\d{4}-\\d{2}-\\d{2}");

        LocalDate toDate = LocalDate.parse(toCaptor.getValue());
        LocalDate fromDate = LocalDate.parse(fromCaptor.getValue());
        assertThat(toDate).isBetween(before, after);
        assertThat(fromDate).isEqualTo(toDate.minusDays(7));
        assertThat(fromDate).isBefore(toDate);
    }

    @Test
    void shouldReturnEmptyArrayForBlankEncodedSymbolWithoutFabrication() throws Exception {
        when(finnhubClient.getCompanyNews(anyString(), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/{symbol}", "   ").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(finnhubClient).getCompanyNews(eq("   "), anyString(), anyString());
    }

    @Test
    void shouldReturnEmptyArrayForSpecialCharacterSymbolWithoutFakeData() throws Exception {
        when(finnhubClient.getCompanyNews(anyString(), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/$INVALID").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(finnhubClient).getCompanyNews(eq("$INVALID"), anyString(), anyString());
    }

    @Test
    void shouldClarifyWhetherControllerMustRejectBlankOrMalformedSymbolsBeforeClientCall() {
    }

    @Test
    void shouldClarifyProviderExceptionHandlingOwnership() {
    }

    @Test
    void shouldExposeNewsCacheAnnotationAndRawSymbolKeyRisk() throws Exception {
        var method = NewsController.class.getMethod("getNews", String.class);
        Cacheable cacheable = method.getAnnotation(Cacheable.class);

        assertThat(cacheable).isNotNull();
        assertThat(cacheable.value()).containsExactly("newsCache");
        assertThat(cacheable.key()).isEqualTo("#symbol");
    }

    @Test
    void shouldRejectUnsupportedMethodsAndRoutesAsNonSuccessful() throws Exception {
        mockMvc.perform(post(BASE_PATH + "/AAPL")).andExpect(status().is4xxClientError());
        mockMvc.perform(put(BASE_PATH + "/AAPL")).andExpect(status().is4xxClientError());
        mockMvc.perform(delete(BASE_PATH + "/AAPL")).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PATH)).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PATH + "/AAPL/extra")).andExpect(status().is4xxClientError());

        verifyNoMoreInteractions(finnhubClient);
    }

    @Test
    void shouldSupportJsonContentNegotiation() throws Exception {
        when(finnhubClient.getCompanyNews(anyString(), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON));
    }

    @Test
    void shouldRejectUnsupportedAcceptType() throws Exception {
        when(finnhubClient.getCompanyNews(anyString(), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept("text/csv"))
                .andExpect(status().isNotAcceptable());
    }

    @Test
    void shouldNotExposeStackTraceOrSecretsOnRepresentativeErrorBody() throws Exception {
        mockMvc.perform(get(BASE_PATH))
                .andExpect(status().is4xxClientError())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Exception"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("java.lang"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("finnhub.api-key"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("AZURE_OPENAI"))));

        verify(finnhubClient, never()).getCompanyNews(anyString(), anyString(), anyString());
    }

    @Test
    void shouldClarifyStableErrorShapeOwnershipForExistingControllers() {
    }

    private FinnhubNewsDto news(long datetime, String headline, String summary, String source, String url, String category, String image) {
        FinnhubNewsDto dto = new FinnhubNewsDto();
        dto.setDatetime(datetime);
        dto.setHeadline(headline);
        dto.setSummary(summary);
        dto.setSource(source);
        dto.setUrl(url);
        dto.setCategory(category);
        dto.setImage(image);
        return dto;
    }
}


