package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.ozkaslibasar.financeproject.domain.model.FinancialHistorySnapshot;
import com.ozkaslibasar.financeproject.domain.model.FinancialHistoryStatus;
import com.ozkaslibasar.financeproject.domain.model.FinancialYearRaw;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class DataServiceFinancialHistoryAdapterTest {

    private static final String URL = "http://data-service.test/api/v1/research/financial-history/AAPL";

    private MockRestServiceServer server;
    private DataServiceFinancialHistoryAdapter adapter;

    @BeforeEach
    void setUp() {
        RestTemplate restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        adapter = new DataServiceFinancialHistoryAdapter(restTemplate);
        ReflectionTestUtils.setField(adapter, "dataServiceBaseUrl", "http://data-service.test");
    }

    private static String body(String status, String dates, String revenue, String extraSeries) {
        return """
                {"status":"%s","currency":"USD","period_type":"annual",
                 "fiscal_year_ends":%s,
                 "series":{"revenue":%s,"net_income":[1.5,2.5],"operating_cash_flow":[3.0,4.0]%s},
                 "retrieved_at":"2026-10-28T10:15:30Z"}
                """.formatted(status, dates, revenue, extraSeries);
    }

    @Test
    void mapsFullResponse() {
        server.expect(once(), requestTo(URL)).andExpect(method(GET))
                .andRespond(withSuccess(body("AVAILABLE", "[\"2023-09-30\",\"2024-09-28\"]",
                        "[100.5,200.25]", ",\"cash\":[7.0,8.0]"), APPLICATION_JSON));

        FinancialHistorySnapshot snap = adapter.fetchHistory("AAPL");

        assertThat(snap.symbol()).isEqualTo("AAPL");
        assertThat(snap.status()).isEqualTo(FinancialHistoryStatus.AVAILABLE);
        assertThat(snap.currency()).isEqualTo("USD");
        assertThat(snap.retrievedAt()).isEqualTo(Instant.parse("2026-10-28T10:15:30Z"));
        assertThat(snap.years()).hasSize(2);
        FinancialYearRaw first = snap.years().get(0);
        FinancialYearRaw second = snap.years().get(1);
        assertThat(first.fiscalYear()).isEqualTo(2023);
        assertThat(first.fiscalYearEnd()).isEqualTo(LocalDate.of(2023, 9, 30));
        assertThat(second.fiscalYear()).isEqualTo(2024);
        assertThat(first.revenue()).isEqualByComparingTo("100.5");
        assertThat(second.revenue()).isEqualByComparingTo("200.25");
        assertThat(first.netIncome()).isEqualByComparingTo("1.5");
        assertThat(second.operatingCashFlow()).isEqualByComparingTo("4.0");
        assertThat(second.cash()).isEqualByComparingTo("8.0");
        assertThat(first.totalAssets()).isNull();
        server.verify();
    }

    @Test
    void fiftyTwoFiftyThreeWeekYearEnds_getDistinctFiscalYearLabels() {
        server.expect(requestTo(URL)).andRespond(withSuccess("""
                {"status":"AVAILABLE","currency":"USD","period_type":"annual",
                 "fiscal_year_ends":["2022-01-02","2023-01-01","2023-12-31","2024-02-03"],
                 "series":{"revenue":[1.0,2.0,3.0,4.0]},
                 "retrieved_at":"2026-10-28T10:15:30Z"}
                """, APPLICATION_JSON));

        FinancialHistorySnapshot snap = adapter.fetchHistory("AAPL");

        assertThat(snap.years()).extracting(FinancialYearRaw::fiscalYear)
                .containsExactly(2021, 2022, 2023, 2024);
    }

    @Test
    void reservedCharacterInSymbol_isEncodedAsPathSegment() {
        server.expect(requestTo("http://data-service.test/api/v1/research/financial-history/A%2FB%3Fx=1"))
                .andRespond(withSuccess(body("AVAILABLE", "[\"2023-09-30\",\"2024-09-28\"]",
                        "[1.0,2.0]", ""), APPLICATION_JSON));

        FinancialHistorySnapshot snap = adapter.fetchHistory("A/B?x=1");

        assertThat(snap.status()).isEqualTo(FinancialHistoryStatus.AVAILABLE);
        server.verify();
    }

    @Test
    void jsonNullStaysNull() {
        server.expect(requestTo(URL))
                .andRespond(withSuccess(body("PARTIAL", "[\"2023-09-30\",\"2024-09-28\"]",
                        "[null,200.0]", ""), APPLICATION_JSON));

        FinancialHistorySnapshot snap = adapter.fetchHistory("AAPL");

        assertThat(snap.status()).isEqualTo(FinancialHistoryStatus.PARTIAL);
        assertThat(snap.years().get(0).revenue()).isNull();
        assertThat(snap.years().get(1).revenue()).isEqualByComparingTo("200.0");
    }

    @Test
    void emptyStatus_yieldsEmptyYears() {
        server.expect(requestTo(URL)).andRespond(withSuccess("""
                {"status":"EMPTY","currency":null,"period_type":"annual",
                 "fiscal_year_ends":[],"series":{},"retrieved_at":null}
                """, APPLICATION_JSON));

        FinancialHistorySnapshot snap = adapter.fetchHistory("AAPL");

        assertThat(snap.status()).isEqualTo(FinancialHistoryStatus.EMPTY);
        assertThat(snap.years()).isEmpty();
        assertThat(snap.currency()).isNull();
        assertThat(snap.retrievedAt()).isNull();
    }

    @Test
    void serverError_yieldsUnavailable() {
        server.expect(requestTo(URL)).andRespond(withServerError());
        assertUnavailable(adapter.fetchHistory("AAPL"));
    }

    @Test
    void connectionFailure_yieldsUnavailable() {
        server.expect(requestTo(URL)).andRespond(request -> {
            throw new IOException("connection refused");
        });
        assertUnavailable(adapter.fetchHistory("AAPL"));
    }

    @Test
    void malformedJson_yieldsUnavailable() {
        server.expect(requestTo(URL)).andRespond(withSuccess("{not json", APPLICATION_JSON));
        assertUnavailable(adapter.fetchHistory("AAPL"));
    }

    @Test
    void unequalListLengths_yieldUnavailable() {
        server.expect(requestTo(URL))
                .andRespond(withSuccess(body("AVAILABLE", "[\"2023-09-30\",\"2024-09-28\"]",
                        "[100.0]", ""), APPLICATION_JSON));
        assertUnavailable(adapter.fetchHistory("AAPL"));
    }

    @Test
    void unknownStatus_yieldsUnavailable() {
        server.expect(requestTo(URL))
                .andRespond(withSuccess(body("WEIRD", "[\"2023-09-30\",\"2024-09-28\"]",
                        "[1.0,2.0]", ""), APPLICATION_JSON));
        assertUnavailable(adapter.fetchHistory("AAPL"));
    }

    @Test
    void invalidDate_yieldsUnavailable() {
        server.expect(requestTo(URL))
                .andRespond(withSuccess(body("AVAILABLE", "[\"2023-09-30\",\"nope\"]",
                        "[1.0,2.0]", ""), APPLICATION_JSON));
        assertUnavailable(adapter.fetchHistory("AAPL"));
    }

    @Test
    void missingSeriesKey_treatedAsAllNull() {
        server.expect(requestTo(URL))
                .andRespond(withSuccess(body("PARTIAL", "[\"2023-09-30\",\"2024-09-28\"]",
                        "[1.0,2.0]", ""), APPLICATION_JSON));

        FinancialHistorySnapshot snap = adapter.fetchHistory("AAPL");

        assertThat(snap.status()).isEqualTo(FinancialHistoryStatus.PARTIAL);
        assertThat(snap.years()).hasSize(2);
        assertThat(snap.years()).allSatisfy(y -> {
            assertThat(y.totalDebt()).isNull();
            assertThat(y.currentLiabilities()).isNull();
        });
    }

    private static void assertUnavailable(FinancialHistorySnapshot snap) {
        assertThat(snap.status()).isEqualTo(FinancialHistoryStatus.UNAVAILABLE);
        assertThat(snap.years()).isEmpty();
        assertThat(snap.currency()).isNull();
        assertThat(snap.retrievedAt()).isNull();
        assertThat(snap.symbol()).isEqualTo("AAPL");
    }
}
