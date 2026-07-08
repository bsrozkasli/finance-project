package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.FinnhubClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubNewsDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubPriceTargetDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubRecommendationDto;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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

@WebMvcTest(controllers = CompanyReportController.class)
class CompanyReportControllerTest {

    private static final String BASE_PATH = "/api/v1/reports/company";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TechnicalAnalysisPort technicalAnalysisPort;

    @MockitoBean
    private FinnhubClient finnhubClient;

    @Test
    void shouldReturnCompleteReportAndPreserveContractAndProviderOrder() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo"))
                .thenReturn(Optional.of(technical("AAPL", 11.1, 22.2, 33.3, 44.4, 55.5, 66.6, 77.7, 88.8, 99.9, 111.1, "SELL", 0.42)));
        when(finnhubClient.getRecommendations("AAPL"))
                .thenReturn(List.of(
                        recommendation("2026-07-01", 5, 4, 3, 2, 1),
                        recommendation("2026-06-01", 1, 2, 3, 4, 5)
                ));
        when(finnhubClient.getPriceTarget("AAPL"))
                .thenReturn(priceTarget("AAPL", 260.0, 180.0, 225.5, 39));
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString()))
                .thenReturn(List.of(
                        news(1719302400L, "Headline-1", "Summary-1", "Reuters", "https://example.com/1", "company", "https://example.com/1.png"),
                        news(1719388800L, "Headline-2", "Summary-2", "Bloomberg", "https://example.com/2", "company", "https://example.com/2.png")
                ));

        mockMvc.perform(get(BASE_PATH + "/aapl").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.technical").exists())
                .andExpect(jsonPath("$.recommendations").isArray())
                .andExpect(jsonPath("$.priceTarget").exists())
                .andExpect(jsonPath("$.recentNews").isArray())
                .andExpect(jsonPath("$.technical.symbol").value("AAPL"))
                .andExpect(jsonPath("$.technical.rsi").value(11.1))
                .andExpect(jsonPath("$.technical.macd").value(22.2))
                .andExpect(jsonPath("$.technical.macdSignal").value(33.3))
                .andExpect(jsonPath("$.technical.macdHistogram").value(44.4))
                .andExpect(jsonPath("$.technical.bbUpper").value(55.5))
                .andExpect(jsonPath("$.technical.bbMiddle").value(66.6))
                .andExpect(jsonPath("$.technical.bbLower").value(77.7))
                .andExpect(jsonPath("$.technical.atr").value(88.8))
                .andExpect(jsonPath("$.technical.sma").value(99.9))
                .andExpect(jsonPath("$.technical.ema").value(111.1))
                .andExpect(jsonPath("$.technical.signalAction").value("SELL"))
                .andExpect(jsonPath("$.technical.signalConfidence").value(0.42))
                .andExpect(jsonPath("$.recommendations[0].period").value("2026-07-01"))
                .andExpect(jsonPath("$.recommendations[1].period").value("2026-06-01"))
                .andExpect(jsonPath("$.priceTarget.symbol").value("AAPL"))
                .andExpect(jsonPath("$.priceTarget.targetHigh").value(260.0))
                .andExpect(jsonPath("$.priceTarget.targetLow").value(180.0))
                .andExpect(jsonPath("$.priceTarget.targetMean").value(225.5))
                .andExpect(jsonPath("$.priceTarget.numberOfAnalysts").value(39))
                .andExpect(jsonPath("$.recentNews[0].headline").value("Headline-1"))
                .andExpect(jsonPath("$.recentNews[1].headline").value("Headline-2"))
                .andExpect(jsonPath("$.analystSummary").doesNotExist())
                .andExpect(jsonPath("$.fundamental").doesNotExist())
                .andExpect(jsonPath("$.sentiment").doesNotExist());

        verify(technicalAnalysisPort).fetchTechnicalAnalysis("AAPL", "1d", "3mo");
        verify(finnhubClient).getRecommendations("AAPL");
        verify(finnhubClient).getPriceTarget("AAPL");
        verify(finnhubClient).getCompanyNews(eq("AAPL"), anyString(), anyString());
    }

    @Test
    void shouldDegradeTechnicalToNullWhenTechnicalPortReturnsEmpty() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.empty());
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of(recommendation("2026-07-01", 2, 3, 4, 1, 0)));
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(priceTarget("AAPL", 250.0, 170.0, 220.0, 31));
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenReturn(List.of(news(1719302400L, "N1", "S1", "Reuters", "https://example.com/1", "company", null)));

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.technical").value(nullValue()))
                .andExpect(jsonPath("$.recommendations").isArray())
                .andExpect(jsonPath("$.priceTarget.symbol").value("AAPL"))
                .andExpect(jsonPath("$.recentNews").isArray());

        verify(technicalAnalysisPort).fetchTechnicalAnalysis("AAPL", "1d", "3mo");
        verify(finnhubClient).getRecommendations("AAPL");
        verify(finnhubClient).getPriceTarget("AAPL");
        verify(finnhubClient).getCompanyNews(eq("AAPL"), anyString(), anyString());
    }

    @Test
    void shouldDegradeTechnicalToNullWhenTechnicalPortThrows() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo"))
                .thenThrow(new RuntimeException("technical unavailable"));
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of());
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(priceTarget("AAPL", 240.0, 160.0, 210.0, 25));
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.technical").value(nullValue()))
                .andExpect(jsonPath("$.recommendations").isArray())
                .andExpect(jsonPath("$.priceTarget.symbol").value("AAPL"))
                .andExpect(jsonPath("$.recentNews").isArray());

        verify(technicalAnalysisPort).fetchTechnicalAnalysis("AAPL", "1d", "3mo");
        verify(finnhubClient).getRecommendations("AAPL");
        verify(finnhubClient).getPriceTarget("AAPL");
        verify(finnhubClient).getCompanyNews(eq("AAPL"), anyString(), anyString());
    }

    @Test
    void shouldReturnEmptyRecommendationsWhenRecommendationsAreUnavailableAsEmpty() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.empty());
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of());
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(priceTarget("AAPL", 240.0, 170.0, 210.0, 19));
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recommendations").isArray())
                .andExpect(jsonPath("$.recommendations.length()").value(0));
    }

    @Test
    void shouldAllowNullRecommendationsWhenClientReturnsNull() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.empty());
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(null);
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(priceTarget("AAPL", 235.0, 165.0, 205.0, 17));
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recommendations").value(nullValue()));
    }

    @Test
    void shouldDegradeGracefullyWhenRecommendationsCallThrows() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.empty());
        when(finnhubClient.getRecommendations("AAPL")).thenThrow(new RuntimeException("recommendations failed"));
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(priceTarget("AAPL", 235.0, 165.0, 205.0, 17));
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    void shouldAllowNullPriceTargetWithoutFabricatingValues() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.empty());
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of(recommendation("2026-07-01", 3, 2, 1, 0, 0)));
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(null);
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenReturn(List.of(news(1719302400L, "N1", "S1", "Reuters", "https://example.com/1", "company", null)));

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priceTarget").value(nullValue()))
                .andExpect(jsonPath("$.recommendations").isArray())
                .andExpect(jsonPath("$.recentNews").isArray());
    }

    @Test
    void shouldDegradeGracefullyWhenPriceTargetCallThrows() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.empty());
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of());
        when(finnhubClient.getPriceTarget("AAPL")).thenThrow(new RuntimeException("price target failed"));
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    void shouldReturnEmptyNewsWhenNewsIsUnavailableAsEmpty() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.empty());
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of());
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(priceTarget("AAPL", 230.0, 160.0, 200.0, 11));
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentNews").isArray())
                .andExpect(jsonPath("$.recentNews.length()").value(0));
    }

    @Test
    void shouldAllowNullNewsWhenClientReturnsNull() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.empty());
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of());
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(priceTarget("AAPL", 230.0, 160.0, 200.0, 11));
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenReturn(null);

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentNews").value(nullValue()));
    }

    @Test
    void shouldDegradeGracefullyWhenNewsCallThrows() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.empty());
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of());
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(priceTarget("AAPL", 230.0, 160.0, 200.0, 11));
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenThrow(new RuntimeException("news failed"));

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    void shouldUseSevenDayIsoDateWindowForFinnhubNews() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.empty());
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of());
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(null);
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenReturn(List.of());

        LocalDate before = LocalDate.now();
        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk());
        LocalDate after = LocalDate.now();

        ArgumentCaptor<String> fromCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> toCaptor = ArgumentCaptor.forClass(String.class);
        verify(finnhubClient).getCompanyNews(eq("AAPL"), fromCaptor.capture(), toCaptor.capture());

        assertThat(fromCaptor.getValue()).matches("\\d{4}-\\d{2}-\\d{2}");
        assertThat(toCaptor.getValue()).matches("\\d{4}-\\d{2}-\\d{2}");

        LocalDate toDate = LocalDate.parse(toCaptor.getValue());
        LocalDate fromDate = LocalDate.parse(fromCaptor.getValue());
        assertThat(toDate).isBetween(before, after);
        assertThat(fromDate).isEqualTo(toDate.minusDays(7));
        assertThat(fromDate).isBefore(toDate);
    }

    @ParameterizedTest
    @ValueSource(strings = {"AAPL", "aapl", "AaPl"})
    void shouldNormalizeSymbolToUppercaseForAllDependencies(String symbol) throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.empty());
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of());
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(null);
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/{symbol}", symbol).accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("AAPL"));

        verify(technicalAnalysisPort).fetchTechnicalAnalysis("AAPL", "1d", "3mo");
        verify(finnhubClient).getRecommendations("AAPL");
        verify(finnhubClient).getPriceTarget("AAPL");
        verify(finnhubClient).getCompanyNews(eq("AAPL"), anyString(), anyString());
    }

    @Test
    void shouldUppercaseButNotTrimEncodedSurroundingWhitespaceInSymbol() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis(" AAPL ", "1d", "3mo")).thenReturn(Optional.empty());
        when(finnhubClient.getRecommendations(" AAPL ")).thenReturn(List.of());
        when(finnhubClient.getPriceTarget(" AAPL ")).thenReturn(null);
        when(finnhubClient.getCompanyNews(eq(" AAPL "), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/{symbol}", " aapl ").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value(" AAPL "));

        verify(technicalAnalysisPort).fetchTechnicalAnalysis(" AAPL ", "1d", "3mo");
        verify(finnhubClient).getRecommendations(" AAPL ");
        verify(finnhubClient).getPriceTarget(" AAPL ");
        verify(finnhubClient).getCompanyNews(eq(" AAPL "), anyString(), anyString());
    }

    @Test
    void shouldMapEveryTechnicalFieldWithoutSwaps() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "3mo"))
                .thenReturn(Optional.of(technical("SYM", 1.01, 2.02, 3.03, 4.04, 5.05, 6.06, 7.07, 8.08, 9.09, 10.10, "BUY", 0.77)));
        when(finnhubClient.getRecommendations("AAPL")).thenReturn(List.of());
        when(finnhubClient.getPriceTarget("AAPL")).thenReturn(null);
        when(finnhubClient.getCompanyNews(eq("AAPL"), anyString(), anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.technical.symbol").value("SYM"))
                .andExpect(jsonPath("$.technical.rsi").value(1.01))
                .andExpect(jsonPath("$.technical.macd").value(2.02))
                .andExpect(jsonPath("$.technical.macdSignal").value(3.03))
                .andExpect(jsonPath("$.technical.macdHistogram").value(4.04))
                .andExpect(jsonPath("$.technical.bbUpper").value(5.05))
                .andExpect(jsonPath("$.technical.bbMiddle").value(6.06))
                .andExpect(jsonPath("$.technical.bbLower").value(7.07))
                .andExpect(jsonPath("$.technical.atr").value(8.08))
                .andExpect(jsonPath("$.technical.sma").value(9.09))
                .andExpect(jsonPath("$.technical.ema").value(10.1))
                .andExpect(jsonPath("$.technical.signalAction").value("BUY"))
                .andExpect(jsonPath("$.technical.signalConfidence").value(0.77));
    }

    @Test
    void shouldExposeCacheAnnotationForCompanyReport() throws Exception {
        Cacheable cacheable = CompanyReportController.class
                .getMethod("getCompanyReport", String.class)
                .getAnnotation(Cacheable.class);

        assertThat(cacheable).isNotNull();
        assertThat(cacheable.value()).containsExactly("companyReportCache");
        assertThat(cacheable.key()).isEqualTo("#symbol.toUpperCase()");
    }

    @Test
    void shouldRejectUnsupportedRoutesAndHttpMethodsAsNon200() throws Exception {
        MvcResult missingSymbol = mockMvc.perform(get(BASE_PATH)).andReturn();
        MvcResult extraSegment = mockMvc.perform(get(BASE_PATH + "/AAPL/extra")).andReturn();

        assertThat(missingSymbol.getResponse().getStatus()).isNotEqualTo(200);
        assertThat(extraSegment.getResponse().getStatus()).isNotEqualTo(200);

        mockMvc.perform(post(BASE_PATH + "/AAPL")).andExpect(status().isMethodNotAllowed());
        mockMvc.perform(put(BASE_PATH + "/AAPL")).andExpect(status().isMethodNotAllowed());
        mockMvc.perform(delete(BASE_PATH + "/AAPL")).andExpect(status().isMethodNotAllowed());

        verifyNoInteractions(technicalAnalysisPort, finnhubClient);
    }

    @Test
    void shouldNotLeakSensitiveDetailsOnRepresentativeRoutingError() throws Exception {
        mockMvc.perform(get(BASE_PATH))
                .andExpect(status().is4xxClientError())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Exception"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("java.lang"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("SQLException"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("DB_PASSWORD"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("FINNHUB_API_KEY"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("AZURE_OPENAI"))));

        verifyNoMoreInteractions(technicalAnalysisPort, finnhubClient);
    }

    private TechnicalAnalysisPort.TechnicalAnalysisResult technical(
            String symbol,
            Double rsi,
            Double macd,
            Double macdSignal,
            Double macdHistogram,
            Double bbUpper,
            Double bbMiddle,
            Double bbLower,
            Double atr,
            Double sma,
            Double ema,
            String action,
            Double confidence
    ) {
        return new TechnicalAnalysisPort.TechnicalAnalysisResult(
                symbol,
                "2026-07-01T10:15:00Z",
                rsi,
                macd,
                macdSignal,
                macdHistogram,
                bbUpper,
                bbMiddle,
                bbLower,
                atr,
                sma,
                ema,
                action,
                confidence
        );
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
            Integer analysts
    ) {
        FinnhubPriceTargetDto dto = new FinnhubPriceTargetDto();
        dto.setSymbol(symbol);
        dto.setTargetHigh(high);
        dto.setTargetLow(low);
        dto.setTargetMean(mean);
        dto.setNumberOfAnalysts(analysts);
        return dto;
    }

    private FinnhubNewsDto news(
            long datetime,
            String headline,
            String summary,
            String source,
            String url,
            String category,
            String image
    ) {
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
