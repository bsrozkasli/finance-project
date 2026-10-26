package com.ozkaslibasar.financeproject.domain.model;

import com.ozkaslibasar.financeproject.domain.model.ProviderFetch.Outcome;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ProviderFetchTest {

    @Test
    void dataIsPresentIfAndOnlyIfTheOutcomeIsOk() {
        assertThat(ProviderFetch.ok("x").data()).isEqualTo("x");
        assertThat(ProviderFetch.ok("x").ok()).isTrue();
        for (ProviderFetch<String> notOk : List.of(
                ProviderFetch.<String>empty("m"), ProviderFetch.<String>failed("m"),
                ProviderFetch.<String>rateLimited("m"), ProviderFetch.<String>insufficientData("m"))) {
            assertThat(notOk.data()).isNull();
            assertThat(notOk.ok()).isFalse();
            assertThat(notOk.message()).isEqualTo("m");
        }
        assertThatThrownBy(() -> new ProviderFetch<>(Outcome.OK, null, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ProviderFetch<>(Outcome.FAILED, "x", "m")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ProviderFetch<String>(null, null, "m")).isInstanceOf(NullPointerException.class);
    }

    @Test
    void mapKeepsTheOutcomeAndMessageOfANonOkResult() {
        assertThat(ProviderFetch.ok(2).map(v -> v * 3).data()).isEqualTo(6);
        ProviderFetch<Integer> mapped = ProviderFetch.<Integer>rateLimited("slow").map(v -> v * 3);
        assertThat(mapped.outcome()).isEqualTo(Outcome.RATE_LIMITED);
        assertThat(mapped.message()).isEqualTo("slow");
    }

    @Test
    void researchPortDefaultsWrapTheOptionalMethodsAsOkOrEmpty() {
        ResearchDataPort port = mock(ResearchDataPort.class, CALLS_REAL_METHODS);
        ResearchDataPort.FundamentalResearch fundamental =
                new ResearchDataPort.FundamentalResearch("AAPL", null, "2025", "USD", "t");
        ResearchDataPort.EarningsQuarter quarter = new ResearchDataPort.EarningsQuarter("2026Q1", 1.0, 1.0, 0.0, 0.0, true);
        ResearchDataPort.InstitutionalScores scores = new ResearchDataPort.InstitutionalScores(7, null, null, null, null, null);
        when(port.fetchFundamental("AAPL")).thenReturn(Optional.of(fundamental));
        when(port.fetchFundamental("NONE")).thenReturn(Optional.empty());
        when(port.fetchEarnings("AAPL")).thenReturn(List.of(quarter));
        when(port.fetchEarnings("NONE")).thenReturn(List.of());
        when(port.fetchInstitutionalScores("AAPL")).thenReturn(Optional.of(scores));
        when(port.fetchInstitutionalScores("NONE")).thenReturn(Optional.empty());

        assertThat(port.fetchFundamentalResult("AAPL")).isEqualTo(ProviderFetch.ok(fundamental));
        assertThat(port.fetchFundamentalResult("NONE").outcome()).isEqualTo(Outcome.EMPTY);
        assertThat(port.fetchEarningsResult("AAPL").data()).containsExactly(quarter);
        assertThat(port.fetchEarningsResult("NONE").outcome()).isEqualTo(Outcome.EMPTY);
        assertThat(port.fetchInstitutionalScoresResult("AAPL").data()).isEqualTo(scores);
        assertThat(port.fetchInstitutionalScoresResult("NONE").outcome()).isEqualTo(Outcome.EMPTY);
        assertThat(port.fetchFundamentalResult("NONE").message()).isEqualTo("Provider returned no data");
    }

    @Test
    void technicalPortDefaultsWrapTheOptionalMethodsAsOkOrEmpty() {
        TechnicalAnalysisPort port = mock(TechnicalAnalysisPort.class, CALLS_REAL_METHODS);
        TechnicalAnalysisPort.TechnicalAnalysisResult result = new TechnicalAnalysisPort.TechnicalAnalysisResult(
                "AAPL", "t", 55.0, null, null, null, null, null, null, null, null, null, null, null, null, "BUY", 0.7);
        when(port.fetchTechnicalAnalysis("AAPL", "1d", "3mo")).thenReturn(Optional.of(result));
        when(port.fetchTechnicalAnalysis("NONE", "1d", "3mo")).thenReturn(Optional.empty());
        when(port.fetchTechnicalSignals("AAPL", "1d", "3mo")).thenReturn(Optional.of(result));
        when(port.fetchTechnicalSignals("NONE", "1d", "3mo")).thenReturn(Optional.empty());

        assertThat(port.fetchTechnicalAnalysisResult("AAPL", "1d", "3mo")).isEqualTo(ProviderFetch.ok(result));
        assertThat(port.fetchTechnicalAnalysisResult("NONE", "1d", "3mo").outcome()).isEqualTo(Outcome.EMPTY);
        assertThat(port.fetchTechnicalSignalsResult("AAPL", "1d", "3mo")).isEqualTo(ProviderFetch.ok(result));
        assertThat(port.fetchTechnicalSignalsResult("NONE", "1d", "3mo").outcome()).isEqualTo(Outcome.EMPTY);
    }
}
