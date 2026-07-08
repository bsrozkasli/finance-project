package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.FinnhubClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubInsiderTransactionsDto;
import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportMarketDataPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
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

@WebMvcTest(controllers = FundamentalsController.class)
class FundamentalsControllerTest {

    private static final String BASE_PATH = "/api/v1/fundamentals";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FinancialDataPort financialDataPort;

    @Autowired
    private SmartReportMarketDataPort marketDataPort;

    @MockitoBean
    private ResearchDataPort researchDataPort;

    @MockitoBean
    private FinnhubClient finnhubClient;

    @Test
    void shouldReturnFundamentalsSummaryContractAndNormalizeSymbol() throws Exception {
        when(financialDataPort.fetchStatements("AAPL")).thenReturn(List.of(
                statement("AAPL", 2025, "1200", "180", "210"),
                statement("AAPL", 2026, "1400", "220", "260")
        ));
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.of(
                new ResearchDataPort.FundamentalResearch(
                        "AAPL",
                        metrics(0.15, 0.08, 0.10, 0.52, 0.30, 0.16, 2.1, 1.8, 0.9),
                        "2026",
                        "USD",
                        "2026-07-01T10:00:00Z"
                )
        ));
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.of(
                new SmartReportMarketDataPort.CompanyMetrics(30.0, 8.0, 0.7, 0.12, 0.21, 0.015)
        ));
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(List.of(
                quarter("2026-Q1", 2.34, 2.20, 0.14, 6.36),
                quarter("FY2025Q4", 2.10, 2.00, 0.10, 5.00)
        ));

        mockMvc.perform(get(BASE_PATH + "/aapl").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.revenue").isArray())
                .andExpect(jsonPath("$.netIncome").isArray())
                .andExpect(jsonPath("$.eps").isArray())
                .andExpect(jsonPath("$.freeCashFlow").isArray())
                .andExpect(jsonPath("$.grossMargin").value(0.52))
                .andExpect(jsonPath("$.netMargin").value(0.16))
                .andExpect(jsonPath("$.roic").value(0.10))
                .andExpect(jsonPath("$.roe").value(0.15))
                .andExpect(jsonPath("$.dividendYield").value(0.015))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.content").doesNotExist());

        verify(financialDataPort).fetchStatements("AAPL");
        verify(researchDataPort).fetchFundamental("AAPL");
        verify(researchDataPort).fetchEarnings("AAPL");
        verify(marketDataPort).fetchCompanyMetrics("AAPL");
    }

    @Test
    void shouldReturnPartialFundamentalsWhenStatementsPortThrows() throws Exception {
        when(financialDataPort.fetchStatements("AAPL")).thenThrow(new RuntimeException("statements unavailable"));
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.of(
                new ResearchDataPort.FundamentalResearch("AAPL", metrics(0.11, 0.07, 0.09, 0.48, 0.25, 0.12, 1.9, 1.5, 1.1), "2026", "USD", "2026-07-01T10:00:00Z")
        ));
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.of(
                new SmartReportMarketDataPort.CompanyMetrics(29.0, 7.0, 0.6, 0.11, 0.19, 0.012)
        ));
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revenue").isEmpty())
                .andExpect(jsonPath("$.netIncome").isEmpty())
                .andExpect(jsonPath("$.freeCashFlow").isEmpty())
                .andExpect(jsonPath("$.grossMargin").value(0.48))
                .andExpect(jsonPath("$.dividendYield").value(0.012));
    }

    @Test
    void shouldReturnPartialFundamentalsWhenResearchFundamentalIsMissing() throws Exception {
        when(financialDataPort.fetchStatements("AAPL")).thenReturn(List.of(statement("AAPL", 2026, "1000", "100", "120")));
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.empty());
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.of(
                new SmartReportMarketDataPort.CompanyMetrics(20.0, 6.0, 0.8, 0.13, 0.14, 0.010)
        ));
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.grossMargin").doesNotExist())
                .andExpect(jsonPath("$.netMargin").doesNotExist())
                .andExpect(jsonPath("$.roic").doesNotExist())
                .andExpect(jsonPath("$.roe").doesNotExist())
                .andExpect(jsonPath("$.dividendYield").value(0.010));
    }

    @Test
    void shouldReturnPartialFundamentalsWhenMarketMetricsAreMissing() throws Exception {
        when(financialDataPort.fetchStatements("AAPL")).thenReturn(List.of(statement("AAPL", 2026, "1000", "100", "120")));
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.of(
                new ResearchDataPort.FundamentalResearch("AAPL", metrics(0.11, 0.07, 0.09, 0.48, 0.25, 0.12, 1.9, 1.5, 1.1), "2026", "USD", "2026-07-01T10:00:00Z")
        ));
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.empty());
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.grossMargin").value(0.48))
                .andExpect(jsonPath("$.dividendYield").doesNotExist());
    }

    @Test
    void shouldReturnPartialFundamentalsWhenEarningsAreMissing() throws Exception {
        when(financialDataPort.fetchStatements("AAPL")).thenReturn(List.of(statement("AAPL", 2026, "1000", "100", "120")));
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.of(
                new ResearchDataPort.FundamentalResearch("AAPL", metrics(0.11, 0.07, 0.09, 0.48, 0.25, 0.12, 1.9, 1.5, 1.1), "2026", "USD", "2026-07-01T10:00:00Z")
        ));
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.of(
                new SmartReportMarketDataPort.CompanyMetrics(20.0, 6.0, 0.8, 0.13, 0.14, 0.010)
        ));
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eps").isEmpty());
    }

    @Test
    void shouldSortStatementsAndMapAnnualFinancialFields() throws Exception {
        when(financialDataPort.fetchStatements("AAPL")).thenReturn(List.of(
                statement("AAPL", 2025, "1400", "180", "240"),
                statement("AAPL", 2023, "1000", "120", "160"),
                statement("AAPL", 2024, "1200", "150", "200")
        ));
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.empty());
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.empty());
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revenue[0].year").value(2023))
                .andExpect(jsonPath("$.revenue[0].value").value(1000))
                .andExpect(jsonPath("$.revenue[1].year").value(2024))
                .andExpect(jsonPath("$.revenue[1].value").value(1200))
                .andExpect(jsonPath("$.revenue[2].year").value(2025))
                .andExpect(jsonPath("$.revenue[2].value").value(1400))
                .andExpect(jsonPath("$.netIncome[0].value").value(120))
                .andExpect(jsonPath("$.netIncome[1].value").value(150))
                .andExpect(jsonPath("$.netIncome[2].value").value(180))
                .andExpect(jsonPath("$.freeCashFlow[0].value").value(160))
                .andExpect(jsonPath("$.freeCashFlow[1].value").value(200))
                .andExpect(jsonPath("$.freeCashFlow[2].value").value(240));
    }

    @Test
    void shouldDeriveAnnualEpsFromValidPeriodsAndSkipInvalidRows() throws Exception {
        when(financialDataPort.fetchStatements("AAPL")).thenReturn(List.of());
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.empty());
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.empty());
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(List.of(
                quarter("2026-Q1", 2.34, 2.20, 0.14, 6.36),
                quarter("FY2025Q4", 2.10, 2.00, 0.10, 5.00),
                quarter("bad-period", 1.00, 0.90, 0.10, 11.11),
                quarter(null, 1.00, 0.90, 0.10, 11.11),
                quarter("2024-Q2", null, 0.90, 0.10, 11.11)
        ));

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eps.length()").value(2))
                .andExpect(jsonPath("$.eps[0].year").value(2026))
                .andExpect(jsonPath("$.eps[0].value").value(2.34))
                .andExpect(jsonPath("$.eps[1].year").value(2025))
                .andExpect(jsonPath("$.eps[1].value").value(2.10));
    }

    @Test
    void shouldReturnRatiosWithMarketPriorityAndResearchFallback() throws Exception {
        when(marketDataPort.fetchCompanyMetrics("MSFT")).thenReturn(Optional.of(
                new SmartReportMarketDataPort.CompanyMetrics(31.0, 12.0, null, 0.20, null, 0.009)
        ));
        when(researchDataPort.fetchFundamental("MSFT")).thenReturn(Optional.of(
                new ResearchDataPort.FundamentalResearch(
                        "MSFT",
                        metrics(0.18, 0.09, 0.13, 0.55, 0.33, 0.19, 2.2, 1.6, 1.4),
                        "2026",
                        "USD",
                        "2026-07-01T10:00:00Z"
                )
        ));

        mockMvc.perform(get(BASE_PATH + "/MSFT/ratios").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pe").value(31.0))
                .andExpect(jsonPath("$.pb").value(12.0))
                .andExpect(jsonPath("$.ps").doesNotExist())
                .andExpect(jsonPath("$.evEbitda").doesNotExist())
                .andExpect(jsonPath("$.debtEquity").value(1.4))
                .andExpect(jsonPath("$.currentRatio").value(2.2))
                .andExpect(jsonPath("$.quickRatio").value(1.6))
                .andExpect(jsonPath("$.roe").value(0.18))
                .andExpect(jsonPath("$.roa").value(0.09));
    }

    @Test
    void shouldReturnRatiosWithNullsWhenSourcesAreUnavailable() throws Exception {
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.empty());
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.empty());

        mockMvc.perform(get(BASE_PATH + "/AAPL/ratios").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pe").doesNotExist())
                .andExpect(jsonPath("$.pb").doesNotExist())
                .andExpect(jsonPath("$.debtEquity").doesNotExist())
                .andExpect(jsonPath("$.currentRatio").doesNotExist())
                .andExpect(jsonPath("$.quickRatio").doesNotExist())
                .andExpect(jsonPath("$.roe").doesNotExist())
                .andExpect(jsonPath("$.roa").doesNotExist());
    }

    @Test
    void shouldReturnEarningsWithDefaultPeriodLimitAndStableFieldNames() throws Exception {
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(earningsList(10));

        mockMvc.perform(get(BASE_PATH + "/AAPL/earnings").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8))
                .andExpect(jsonPath("$[0].quarter").exists())
                .andExpect(jsonPath("$[0].epsEstimate").exists())
                .andExpect(jsonPath("$[0].epsActual").exists())
                .andExpect(jsonPath("$[0].surprise").exists())
                .andExpect(jsonPath("$[0].revenueEstimate").doesNotExist())
                .andExpect(jsonPath("$[0].revenueActual").doesNotExist())
                .andExpect(jsonPath("$[0].surprisePct").exists())
                .andExpect(jsonPath("$[0].period").doesNotExist())
                .andExpect(jsonPath("$[0].estimate").doesNotExist())
                .andExpect(jsonPath("$[0].actual").doesNotExist());

        verify(researchDataPort).fetchEarnings("AAPL");
    }

    @Test
    void shouldApplyPositiveEarningsPeriodLimit() throws Exception {
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(earningsList(5));

        mockMvc.perform(get(BASE_PATH + "/AAPL/earnings?periods=2").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-5"})
    void shouldClampZeroAndNegativeEarningsPeriodsToOne(String periods) throws Exception {
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(earningsList(5));

        mockMvc.perform(get(BASE_PATH + "/AAPL/earnings").param("periods", periods).accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void shouldReturn400ForNonNumericEarningsPeriodsAndAvoidProviderCalls() throws Exception {
        mockMvc.perform(get(BASE_PATH + "/AAPL/earnings").param("periods", "abc").accept(APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(researchDataPort, financialDataPort, marketDataPort);
    }

    @Test
    void shouldMapInsiderActivityAndLimitToTwentyRows() throws Exception {
        List<FinnhubInsiderTransactionsDto.Transaction> transactions = new ArrayList<>();

        FinnhubInsiderTransactionsDto.Transaction sell = insiderTx("Alice", "0", "-10", "100", "2026-06-01", "2026-06-02");
        FinnhubInsiderTransactionsDto.Transaction buyNoChange = insiderTx("Bob", "5", null, null, "2026-06-03", "2026-06-04");
        transactions.add(sell);
        transactions.add(buyNoChange);

        for (int i = 0; i < 19; i++) {
            transactions.add(insiderTx("Holder-" + i, "1", "1", "10", "2026-06-05", "2026-06-06"));
        }

        when(finnhubClient.getInsiderTransactions("AAPL")).thenReturn(transactions);

        mockMvc.perform(get(BASE_PATH + "/AAPL/insider").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(20))
                .andExpect(jsonPath("$[0].name").value("Alice"))
                .andExpect(jsonPath("$[0].transactionType").value("SELL"))
                .andExpect(jsonPath("$[0].shares").value(10))
                .andExpect(jsonPath("$[0].price").value(100))
                .andExpect(jsonPath("$[0].value").value(1000))
                .andExpect(jsonPath("$[0].date").value("2026-06-01"))
                .andExpect(jsonPath("$[0].filingDate").value("2026-06-02"))
                .andExpect(jsonPath("$[1].name").value("Bob"))
                .andExpect(jsonPath("$[1].transactionType").value("BUY"))
                .andExpect(jsonPath("$[1].shares").value(5))
                .andExpect(jsonPath("$[1].price").value(0))
                .andExpect(jsonPath("$[1].value").value(0));

        verify(finnhubClient).getInsiderTransactions("AAPL");
    }

    @Test
    void shouldReturnEmptyInsiderArrayWhenProviderReturnsNoData() throws Exception {
        when(finnhubClient.getInsiderTransactions("AAPL")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL/insider").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void shouldMapInstitutionalScoresAndPercentages() throws Exception {
        when(researchDataPort.fetchInstitutionalScores("AAPL")).thenReturn(Optional.of(
                new ResearchDataPort.InstitutionalScores(8, 3.2, -1.4, 72, "WIDE", 55)
        ));

        mockMvc.perform(get(BASE_PATH + "/AAPL/institutional").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].institution").value("Piotroski F-Score"))
                .andExpect(jsonPath("$[0].shares").value(8))
                .andExpect(jsonPath("$[0].percentHeld").value(88.88888888888889))
                .andExpect(jsonPath("$[1].institution").value("Quality Composite"))
                .andExpect(jsonPath("$[1].shares").value(72))
                .andExpect(jsonPath("$[1].percentHeld").value(72.0))
                .andExpect(jsonPath("$[1].reportDate").value("WIDE"))
                .andExpect(jsonPath("$[2].institution").value("Earnings Quality"))
                .andExpect(jsonPath("$[2].shares").value(55))
                .andExpect(jsonPath("$[2].percentHeld").value(55.0))
                .andExpect(jsonPath("$[2].changeShares").value(3.2))
                .andExpect(jsonPath("$[2].changePercent").value(-1.4));
    }

    @Test
    void shouldReturnEmptyInstitutionalArrayWhenScoresAreUnavailable() throws Exception {
        when(researchDataPort.fetchInstitutionalScores("AAPL")).thenReturn(Optional.empty());

        mockMvc.perform(get(BASE_PATH + "/AAPL/institutional").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"AAPL", "aapl", "AaPl"})
    void shouldNormalizeSummarySymbolToUppercaseBeforeProviderCalls(String symbol) throws Exception {
        when(financialDataPort.fetchStatements("AAPL")).thenReturn(List.of());
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.empty());
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(Optional.empty());
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/{symbol}", symbol).accept(APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(financialDataPort).fetchStatements("AAPL");
        verify(researchDataPort).fetchFundamental("AAPL");
        verify(marketDataPort).fetchCompanyMetrics("AAPL");
        verify(researchDataPort).fetchEarnings("AAPL");
    }

    @Test
    void shouldDelegateWhitespaceSymbolUppercasedWithoutTrimming() throws Exception {
        when(financialDataPort.fetchStatements(anyString())).thenReturn(List.of());
        when(researchDataPort.fetchFundamental(anyString())).thenReturn(Optional.empty());
        when(marketDataPort.fetchCompanyMetrics(anyString())).thenReturn(Optional.empty());
        when(researchDataPort.fetchEarnings(anyString())).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/{symbol}", " AaPl ").accept(APPLICATION_JSON))
                .andExpect(status().isOk());

        ArgumentCaptor<String> symbolCaptor = ArgumentCaptor.forClass(String.class);
        verify(financialDataPort).fetchStatements(symbolCaptor.capture());
        assertThat(symbolCaptor.getValue()).isEqualTo(" AAPL ");
    }

    @Test
    void shouldReturn200PartialWhenMarketProviderThrowsInSummary() throws Exception {
        when(financialDataPort.fetchStatements("AAPL")).thenReturn(List.of(statement("AAPL", 2026, "1000", "100", "120")));
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.of(
                new ResearchDataPort.FundamentalResearch("AAPL", metrics(0.11, 0.07, 0.09, 0.48, 0.25, 0.12, 1.9, 1.5, 1.1), "2026", "USD", "2026-07-01T10:00:00Z")
        ));
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenThrow(new RuntimeException("market unavailable"));
        when(researchDataPort.fetchEarnings("AAPL")).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/AAPL").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dividendYield").doesNotExist());
    }

    @Test
    void shouldReturn200RatiosWhenMarketProviderThrowsAndResearchExists() throws Exception {
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenThrow(new RuntimeException("market unavailable"));
        when(researchDataPort.fetchFundamental("AAPL")).thenReturn(Optional.of(
                new ResearchDataPort.FundamentalResearch("AAPL", metrics(0.18, 0.09, 0.13, 0.55, 0.33, 0.19, 2.2, 1.6, 1.4), "2026", "USD", "2026-07-01T10:00:00Z")
        ));

        mockMvc.perform(get(BASE_PATH + "/AAPL/ratios").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.debtEquity").value(1.4));
    }

    @Test
    void shouldReturn200EmptyEarningsWhenProviderThrows() throws Exception {
        when(researchDataPort.fetchEarnings("AAPL")).thenThrow(new RuntimeException("earnings unavailable"));

        mockMvc.perform(get(BASE_PATH + "/AAPL/earnings").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void shouldReturn200EmptyInsiderWhenProviderThrows() throws Exception {
        when(finnhubClient.getInsiderTransactions("AAPL")).thenThrow(new RuntimeException("insider unavailable"));

        mockMvc.perform(get(BASE_PATH + "/AAPL/insider").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void shouldReturn200EmptyInstitutionalWhenProviderThrows() throws Exception {
        when(researchDataPort.fetchInstitutionalScores("AAPL")).thenThrow(new RuntimeException("institutional unavailable"));

        mockMvc.perform(get(BASE_PATH + "/AAPL/institutional").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void shouldExposeCacheAnnotationKeysAndPotentialNormalizationRisks() throws Exception {
        Cacheable summary = FundamentalsController.class.getMethod("getFundamentals", String.class).getAnnotation(Cacheable.class);
        Cacheable ratios = FundamentalsController.class.getMethod("getRatios", String.class).getAnnotation(Cacheable.class);
        Cacheable earnings = FundamentalsController.class.getMethod("getEarnings", String.class, int.class).getAnnotation(Cacheable.class);
        Cacheable insider = FundamentalsController.class.getMethod("getInsiderActivity", String.class).getAnnotation(Cacheable.class);
        Cacheable institutional = FundamentalsController.class.getMethod("getInstitutionalOwnership", String.class).getAnnotation(Cacheable.class);

        assertThat(summary.value()).containsExactly("fundamentalCache");
        assertThat(summary.key()).isEqualTo("'summary:' + #symbol.toUpperCase()");
        assertThat(ratios.value()).containsExactly("fundamentalCache");
        assertThat(ratios.key()).isEqualTo("'ratios:' + #symbol.toUpperCase()");
        assertThat(earnings.value()).containsExactly("fundamentalCache");
        assertThat(earnings.key()).isEqualTo("'earnings:' + #symbol.toUpperCase() + ':' + #periods");
        assertThat(insider.value()).containsExactly("insiderCache");
        assertThat(insider.key()).isEqualTo("#symbol.toUpperCase()");
        assertThat(institutional.value()).containsExactly("fundamentalCache");
        assertThat(institutional.key()).isEqualTo("'institutional:' + #symbol.toUpperCase()");
    }

    @Test
    void shouldRejectUnsupportedMethodsAndOutOfScopeRoutes() throws Exception {
        mockMvc.perform(post(BASE_PATH + "/AAPL")).andExpect(status().is4xxClientError());
        mockMvc.perform(put(BASE_PATH + "/AAPL/ratios")).andExpect(status().is4xxClientError());
        mockMvc.perform(delete(BASE_PATH + "/AAPL/earnings")).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PATH)).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PATH + "/AAPL/unknown")).andExpect(status().is4xxClientError());

        verifyNoMoreInteractions(financialDataPort, marketDataPort, researchDataPort);
    }

    @Test
    void shouldNotExposeSensitiveDetailsOnRepresentativeBadRequest() throws Exception {
        mockMvc.perform(get(BASE_PATH + "/AAPL/earnings").param("periods", "abc").accept(APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Exception"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("java.lang"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("finnhub.api-key"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("AZURE_OPENAI"))));

        verify(researchDataPort, never()).fetchEarnings(anyString());
    }

    @Test
    void shouldClarifyInstitutionalNullScorePolicy() {
    }

    @Test
    void shouldClarifyWhitespaceSymbolTrimmingOwnership() {
    }

    @Test
    void shouldClarifyStableErrorSchemaRolloutForFundamentalsController() {
    }

    private FinancialStatement statement(String symbol, int year, String revenue, String netIncome, String operatingCashFlow) {
        return new FinancialStatement(
                symbol,
                year,
                "annual",
                new BigDecimal(revenue),
                new BigDecimal(netIncome),
                new BigDecimal("5000"),
                new BigDecimal("2500"),
                new BigDecimal(operatingCashFlow),
                new BigDecimal("3000"),
                new BigDecimal("1200")
        );
    }

    private ResearchDataPort.FundamentalMetrics metrics(
            Double roe,
            Double roa,
            Double roic,
            Double grossMargin,
            Double operatingMargin,
            Double netMargin,
            Double currentRatio,
            Double quickRatio,
            Double debtToEquity) {
        return new ResearchDataPort.FundamentalMetrics(
                roe,
                roa,
                roic,
                grossMargin,
                operatingMargin,
                netMargin,
                currentRatio,
                quickRatio,
                debtToEquity,
                1000.0,
                100.0,
                150.0
        );
    }

    private ResearchDataPort.EarningsQuarter quarter(String period, Double actual, Double estimate, Double surprise, Double surprisePct) {
        return new ResearchDataPort.EarningsQuarter(period, actual, estimate, surprise, surprisePct, null);
    }

    private List<ResearchDataPort.EarningsQuarter> earningsList(int size) {
        List<ResearchDataPort.EarningsQuarter> quarters = new ArrayList<>();
        for (int i = 1; i <= size; i++) {
            quarters.add(new ResearchDataPort.EarningsQuarter(
                    "2026-Q" + i,
                    2.0 + i,
                    1.5 + i,
                    0.5,
                    10.0,
                    Boolean.TRUE
            ));
        }
        return quarters;
    }

    private FinnhubInsiderTransactionsDto.Transaction insiderTx(
            String name,
            String share,
            String change,
            String price,
            String transactionDate,
            String filingDate) {
        FinnhubInsiderTransactionsDto.Transaction tx = new FinnhubInsiderTransactionsDto.Transaction();
        tx.setName(name);
        tx.setShare(share == null ? null : new BigDecimal(share));
        tx.setChange(change == null ? null : new BigDecimal(change));
        tx.setTransactionPrice(price == null ? null : new BigDecimal(price));
        tx.setTransactionDate(transactionDate);
        tx.setFilingDate(filingDate);
        return tx;
    }
}

