package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.SmartReportSectionStatus;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort.ComponentAvailability;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SectionStatusMapperTest {

    @ParameterizedTest
    @CsvSource({
            "available,OK",
            "insufficient,INSUFFICIENT_DATA",
            "unavailable,EMPTY",
            "unparseable,FAILED"
    })
    void mapsEveryDocumentedDataServiceStatus(String status, WatchlistResearchStatus expected) {
        assertThat(SectionStatusMapper.mapStatus(status)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"rate_limited", "stale", "AVAILABLE", "''", "something_new"})
    void unknownStatusMapsToNullNeverOk(String status) {
        assertThat(SectionStatusMapper.mapStatus(status)).isNull();
    }

    @Test
    void nullStatusMapsToNull() {
        assertThat(SectionStatusMapper.mapStatus(null)).isNull();
    }

    @Test
    void passesReasonCodesThroughUnchanged() {
        Map<String, ComponentAvailability> availability = new LinkedHashMap<>();
        availability.put("fundamental_score", new ComponentAvailability("available", null));
        availability.put("valuation_score", new ComponentAvailability("unavailable", "valuation_component_unavailable"));
        availability.put("sentiment_score", new ComponentAvailability("insufficient", "no_articles_in_lookback"));
        availability.put("risk_score", new ComponentAvailability("unparseable", "llm_response_invalid"));
        availability.put("growth_score", new ComponentAvailability("brand_new", "Some_Reason"));

        SmartReportSectionStatus result = SectionStatusMapper.fromAvailability(availability);

        assertThat(result.components().get("fundamental_score"))
                .isEqualTo(new SmartReportSectionStatus.Component(WatchlistResearchStatus.OK, null));
        assertThat(result.components().get("valuation_score"))
                .isEqualTo(new SmartReportSectionStatus.Component(WatchlistResearchStatus.EMPTY, "valuation_component_unavailable"));
        assertThat(result.components().get("sentiment_score"))
                .isEqualTo(new SmartReportSectionStatus.Component(WatchlistResearchStatus.INSUFFICIENT_DATA, "no_articles_in_lookback"));
        assertThat(result.components().get("risk_score"))
                .isEqualTo(new SmartReportSectionStatus.Component(WatchlistResearchStatus.FAILED, "llm_response_invalid"));
        assertThat(result.components().get("growth_score"))
                .isEqualTo(new SmartReportSectionStatus.Component(null, "Some_Reason"));
    }

    @Test
    void overallIsOkOnlyWhenEveryComponentIsOk() {
        SmartReportSectionStatus allOk = SectionStatusMapper.fromAvailability(Map.of(
                "a", new ComponentAvailability("available", null),
                "b", new ComponentAvailability("available", null)));
        assertThat(allOk.overall()).isEqualTo(WatchlistResearchStatus.OK);

        SmartReportSectionStatus oneEmpty = SectionStatusMapper.fromAvailability(Map.of(
                "a", new ComponentAvailability("available", null),
                "b", new ComponentAvailability("unavailable", "b_failed")));
        assertThat(oneEmpty.overall()).isEqualTo(WatchlistResearchStatus.EMPTY);
    }

    @Test
    void overallPrecedenceIsFailedThenInsufficientThenEmpty() {
        assertThat(SectionStatusMapper.overall(List.of(
                WatchlistResearchStatus.EMPTY, WatchlistResearchStatus.INSUFFICIENT_DATA,
                WatchlistResearchStatus.FAILED, WatchlistResearchStatus.OK)))
                .isEqualTo(WatchlistResearchStatus.FAILED);
        assertThat(SectionStatusMapper.overall(List.of(
                WatchlistResearchStatus.EMPTY, WatchlistResearchStatus.INSUFFICIENT_DATA, WatchlistResearchStatus.OK)))
                .isEqualTo(WatchlistResearchStatus.INSUFFICIENT_DATA);
        assertThat(SectionStatusMapper.overall(List.of(WatchlistResearchStatus.EMPTY, WatchlistResearchStatus.OK)))
                .isEqualTo(WatchlistResearchStatus.EMPTY);
    }

    @Test
    void unknownComponentStatusNeverYieldsOkOverall() {
        assertThat(SectionStatusMapper.overall(java.util.Arrays.asList(WatchlistResearchStatus.OK, null))).isNull();
        assertThat(SectionStatusMapper.overall(java.util.Arrays.asList(WatchlistResearchStatus.EMPTY, null)))
                .isEqualTo(WatchlistResearchStatus.EMPTY);
    }

    @Test
    void noAvailabilityAtAllMeansNoSectionStatus() {
        assertThat(SectionStatusMapper.fromAvailability(null)).isNull();
        assertThat(SectionStatusMapper.fromAvailability(Map.of())).isNull();
    }

    @Test
    void fallbackMarksEveryComponentInsufficientWithFallbackReason() {
        SmartReportSectionStatus result = SectionStatusMapper.fallback(List.of("fundamental_score", "valuation_score"));

        assertThat(result.overall()).isEqualTo(WatchlistResearchStatus.INSUFFICIENT_DATA);
        assertThat(result.components()).containsOnlyKeys("fundamental_score", "valuation_score");
        assertThat(result.components().values()).allSatisfy(c -> {
            assertThat(c.status()).isEqualTo(WatchlistResearchStatus.INSUFFICIENT_DATA);
            assertThat(c.reason()).isEqualTo("fallback_source_used");
        });
    }
}
