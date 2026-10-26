package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.DecisionStatus;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class DecisionStatusMapperTest {

    @Test
    void availableMapsToOkWithoutReason() {
        assertThat(DecisionStatusMapper.fromAvailability("available", null))
                .isEqualTo(new DecisionStatus(WatchlistResearchStatus.OK, null));
    }

    @ParameterizedTest
    @CsvSource({
            "unparseable,pm_response_not_json_default_hold",
            "unparseable,pm_response_not_json_keyword_fallback",
            "unparseable,pm_json_missing_or_invalid_fields",
            "unavailable,pm_unavailable_reason",
            "insufficient,pm_insufficient_reason"
    })
    void everyNonAvailableStatusMapsToFailedAndPassesTheReasonThrough(String status, String reason) {
        assertThat(DecisionStatusMapper.fromAvailability(status, reason))
                .isEqualTo(new DecisionStatus(WatchlistResearchStatus.FAILED, reason));
    }

    @Test
    void failedWithoutReasonKeepsNullReason() {
        assertThat(DecisionStatusMapper.fromAvailability("unparseable", null))
                .isEqualTo(new DecisionStatus(WatchlistResearchStatus.FAILED, null));
    }

    @ParameterizedTest
    @CsvSource({"rate_limited", "stale", "AVAILABLE", "''", "something_new"})
    void unknownStatusMapsToNullNeverOk(String status) {
        assertThat(DecisionStatusMapper.fromAvailability(status, "any")).isNull();
    }

    @Test
    void absentStatusMapsToNull() {
        assertThat(DecisionStatusMapper.fromAvailability(null, null)).isNull();
    }
}
