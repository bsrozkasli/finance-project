package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.SmartReportSectionStatus;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort.ComponentAvailability;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Maps data-service section availability to the shared seven-state vocabulary
 * (decision 2026-10-26-section-status-smart-report, D-2 and D-3). Pure and stateless.
 */
public final class SectionStatusMapper {

    public static final String FALLBACK_REASON = "fallback_source_used";

    private SectionStatusMapper() {
    }

    /** Unknown or missing status maps to null, never to OK. */
    public static WatchlistResearchStatus mapStatus(String dataServiceStatus) {
        if (dataServiceStatus == null) {
            return null;
        }
        return switch (dataServiceStatus) {
            case "available" -> WatchlistResearchStatus.OK;
            case "insufficient" -> WatchlistResearchStatus.INSUFFICIENT_DATA;
            case "unavailable" -> WatchlistResearchStatus.EMPTY;
            case "unparseable" -> WatchlistResearchStatus.FAILED;
            default -> null;
        };
    }

    /**
     * Returns null when the source sent no availability at all. An "available" component whose
     * score is null or missing from {@code scores} is reported with status null (R-7): present
     * evidence is never claimed without a value.
     */
    public static SmartReportSectionStatus fromAvailability(
            Map<String, ComponentAvailability> availability, Map<String, Integer> scores) {
        if (availability == null || availability.isEmpty()) {
            return null;
        }
        Map<String, SmartReportSectionStatus.Component> components = new LinkedHashMap<>();
        availability.forEach((name, value) -> {
            if (value == null) {
                components.put(name, new SmartReportSectionStatus.Component(null, null));
                return;
            }
            WatchlistResearchStatus status = mapStatus(value.status());
            if (status == WatchlistResearchStatus.OK && (scores == null || scores.get(name) == null)) {
                status = null;
            }
            components.put(name, new SmartReportSectionStatus.Component(status, value.unavailableReason()));
        });
        return new SmartReportSectionStatus(
                overall(components.values().stream().map(SmartReportSectionStatus.Component::status).toList()),
                components);
    }

    /** Finnhub-derived fallback: thinner evidence than the composite, never OK. */
    public static SmartReportSectionStatus fallback(Collection<String> componentNames) {
        Map<String, SmartReportSectionStatus.Component> components = new LinkedHashMap<>();
        for (String name : componentNames) {
            components.put(name, new SmartReportSectionStatus.Component(
                    WatchlistResearchStatus.INSUFFICIENT_DATA, FALLBACK_REASON));
        }
        return new SmartReportSectionStatus(WatchlistResearchStatus.INSUFFICIENT_DATA, components);
    }

    /**
     * OK only when every component is OK; otherwise the most severe of FAILED, INSUFFICIENT_DATA,
     * EMPTY. Components with an unrecognised status cannot make the overall OK; if nothing more
     * severe is known the overall is null (unknown).
     */
    public static WatchlistResearchStatus overall(Collection<WatchlistResearchStatus> statuses) {
        if (statuses.isEmpty()) {
            return null;
        }
        if (statuses.contains(WatchlistResearchStatus.FAILED)) {
            return WatchlistResearchStatus.FAILED;
        }
        if (statuses.contains(WatchlistResearchStatus.INSUFFICIENT_DATA)) {
            return WatchlistResearchStatus.INSUFFICIENT_DATA;
        }
        if (statuses.contains(WatchlistResearchStatus.EMPTY)) {
            return WatchlistResearchStatus.EMPTY;
        }
        return statuses.stream().allMatch(s -> s == WatchlistResearchStatus.OK)
                ? WatchlistResearchStatus.OK
                : null;
    }
}
