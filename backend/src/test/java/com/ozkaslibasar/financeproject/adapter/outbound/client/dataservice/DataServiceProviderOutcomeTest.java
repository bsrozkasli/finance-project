package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.ozkaslibasar.financeproject.domain.model.ProviderFetch;
import com.ozkaslibasar.financeproject.domain.model.ProviderFetch.Outcome;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseCreator;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.util.function.Function;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * D-2.3: the status code and exception type of the data-service call decide the outcome, never message
 * text. Boundary stub only (MockRestServiceServer); no live provider.
 */
class DataServiceProviderOutcomeTest {

    private static final String BASE = "http://data-service.test";

    /** The five outcome-returning methods, each with a body that yields data. */
    private enum Method {
        FUNDAMENTAL("{\"symbol\":\"AAPL\",\"metrics\":{\"roe\":0.2},\"fiscal_year\":\"2025\"}",
                a -> a.research.fetchFundamentalResult("AAPL")),
        EARNINGS("{\"symbol\":\"AAPL\",\"history\":[{\"period\":\"2026Q1\",\"actual\":1.5}]}",
                a -> a.research.fetchEarningsResult("AAPL")),
        INSTITUTIONAL("{\"symbol\":\"AAPL\",\"scores\":{\"piotroski_f_score\":7}}",
                a -> a.research.fetchInstitutionalScoresResult("AAPL")),
        TECHNICAL("{\"symbol\":\"AAPL\",\"timestamp\":\"t\",\"indicators\":{\"rsi\":55.0}}",
                a -> a.technical.fetchTechnicalAnalysisResult("AAPL", "1d", "3mo")),
        SIGNALS("{\"symbol\":\"AAPL\",\"timestamp\":\"t\",\"signal\":{\"action\":\"BUY\",\"confidence\":0.7}}",
                a -> a.technical.fetchTechnicalSignalsResult("AAPL", "1d", "3mo"));

        final String okBody;
        final Function<Adapters, ProviderFetch<?>> call;

        Method(String okBody, Function<Adapters, ProviderFetch<?>> call) {
            this.okBody = okBody;
            this.call = call;
        }
    }

    private record Adapters(DataServiceResearchAdapter research, TechnicalAnalysisAdapter technical) {
    }

    private record Scenario(String name, ResponseCreator response, Outcome outcome, String message, boolean providerFault) {
        @Override
        public String toString() {
            return name;
        }
    }

    private static Stream<Scenario> failureScenarios() {
        return Stream.of(
                new Scenario("404", withStatus(HttpStatus.NOT_FOUND), Outcome.EMPTY, "Provider returned no data", false),
                new Scenario("422", withStatus(HttpStatus.UNPROCESSABLE_ENTITY), Outcome.INSUFFICIENT_DATA, "Insufficient history", false),
                new Scenario("429", withStatus(HttpStatus.TOO_MANY_REQUESTS), Outcome.RATE_LIMITED, "Provider rate limited", true),
                new Scenario("500", withStatus(HttpStatus.INTERNAL_SERVER_ERROR), Outcome.FAILED, "Provider request failed", true),
                new Scenario("503", withStatus(HttpStatus.SERVICE_UNAVAILABLE), Outcome.FAILED, "Provider request failed", true),
                new Scenario("403", withStatus(HttpStatus.FORBIDDEN), Outcome.FAILED, "Provider request failed", false),
                new Scenario("400", withStatus(HttpStatus.BAD_REQUEST), Outcome.FAILED, "Provider request failed", false),
                new Scenario("timeout", withException(new SocketTimeoutException("Read timed out")), Outcome.FAILED, "Provider request failed", true),
                new Scenario("io-error", withException(new IOException("Connection refused")), Outcome.FAILED, "Provider request failed", true),
                new Scenario("unreadable-body", withSuccess("<html>gateway</html>", MediaType.TEXT_HTML), Outcome.FAILED, "Provider request failed", true),
                new Scenario("malformed-json", withSuccess("{not json", MediaType.APPLICATION_JSON), Outcome.FAILED, "Provider request failed", true),
                new Scenario("empty-body", withSuccess("", MediaType.APPLICATION_JSON), Outcome.EMPTY, "Provider returned no data", false),
                new Scenario("empty-object", withSuccess("{}", MediaType.APPLICATION_JSON), Outcome.EMPTY, "Provider returned no data", false));
    }

    static Stream<Arguments> everyMethodAndFailureScenario() {
        return Stream.of(Method.values())
                .flatMap(method -> failureScenarios().map(scenario -> Arguments.of(method, scenario)));
    }

    private RestTemplate restTemplate;
    private MockRestServiceServer server;
    private Adapters adapters;

    private void setUp() {
        restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        DataServiceResearchAdapter research = new DataServiceResearchAdapter(restTemplate);
        TechnicalAnalysisAdapter technical = new TechnicalAnalysisAdapter(restTemplate);
        ReflectionTestUtils.setField(research, "baseUrl", BASE);
        ReflectionTestUtils.setField(technical, "baseUrl", BASE);
        adapters = new Adapters(research, technical);
    }

    @ParameterizedTest(name = "{0} / {1}")
    @MethodSource("everyMethodAndFailureScenario")
    void statusCodeAndExceptionTypeDecideTheOutcome(Method method, Scenario scenario) {
        setUp();
        server.expect(anything()).andRespond(scenario.response());

        ProviderFetch<?> result = method.call.apply(adapters);

        assertThat(result.outcome()).isEqualTo(scenario.outcome());
        assertThat(result.data()).isNull();
        assertThat(result.message()).isEqualTo(scenario.message());
        assertThat(result.providerFault()).isEqualTo(scenario.providerFault());
        server.verify();
    }

    @ParameterizedTest
    @MethodSource("methods")
    void a200WithDataIsOkAndCarriesNoMessage(Method method) {
        setUp();
        server.expect(anything()).andRespond(withSuccess(method.okBody, MediaType.APPLICATION_JSON));

        ProviderFetch<?> result = method.call.apply(adapters);

        assertThat(result.outcome()).isEqualTo(Outcome.OK);
        assertThat(result.data()).isNotNull();
        assertThat(result.message()).isNull();
        server.verify();
    }

    static Stream<Method> methods() {
        return Stream.of(Method.values());
    }

    @Test
    void messagesNeverCarryRawProviderText() {
        setUp();
        server.expect(anything()).andRespond(
                withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("yfinance secret-token-123 stack trace"));

        ProviderFetch<?> result = adapters.research.fetchFundamentalResult("AAPL");

        assertThat(result.outcome()).isEqualTo(Outcome.FAILED);
        assertThat(result.message()).doesNotContain("secret-token-123").doesNotContain("yfinance");
    }

    @Test
    void earningsWithAnEmptyHistoryIsEmptyNotOk() {
        setUp();
        server.expect(anything()).andRespond(
                withSuccess("{\"symbol\":\"AAPL\",\"history\":[]}", MediaType.APPLICATION_JSON));

        ProviderFetch<?> result = adapters.research.fetchEarningsResult("AAPL");

        assertThat(result.outcome()).isEqualTo(Outcome.EMPTY);
    }

    @Test
    void optionalMethodsKeepTheirEmptyOnFailureBehavior() {
        setUp();
        server.expect(anything()).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        server.expect(anything()).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        server.expect(anything()).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThat(adapters.research.fetchFundamental("AAPL")).isEmpty();
        assertThat(adapters.research.fetchEarnings("AAPL")).isEmpty();
        assertThat(adapters.research.fetchInstitutionalScores("AAPL")).isEmpty();
        server.verify();
    }
}
