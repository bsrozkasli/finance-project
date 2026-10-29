package com.ozkaslibasar.financeproject.domain.model;

import java.util.Map;

/**
 * Per-component evidence status of a smart report. A null status means the source reported a
 * status this contract does not recognise; it is never presented as OK.
 */
public record SmartReportSectionStatus(WatchlistResearchStatus overall, Map<String, Component> components) {

    public record Component(WatchlistResearchStatus status, String reason) {
    }
}
