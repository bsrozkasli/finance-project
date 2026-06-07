package com.ozkaslibasar.financeproject.domain.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Service responsible for normalizing timestamps from various sources
 * (Tiingo UTC, yFinance Local, Finnhub Unix Timestamp) into a consistent UTC Instant.
 */
@Service
@Slf4j
public class PriceNormalizationService {

    private static final ZoneId NY_ZONE = ZoneId.of("America/New_York");

    /**
     * Normalizes Finnhub's Unix timestamp (seconds) to UTC Instant.
     */
    public Instant normalizeFinnhubTimestamp(long unixSeconds) {
        return Instant.ofEpochSecond(unixSeconds);
    }

    /**
     * Normalizes yFinance string (usually local NY time or UTC depending on how it was fetched)
     * Data-service returns it as "2023-10-27T00:00:00Z" if we use _to_utc_z.
     * If it's already an ISO Instant string ending in Z, we parse it directly.
     * If it lacks timezone, we assume NY market time and convert to UTC.
     */
    public Instant normalizeYFinanceTimestamp(String timestampStr) {
        try {
            if (timestampStr.endsWith("Z")) {
                return Instant.parse(timestampStr);
            } else if (timestampStr.contains("+") || (timestampStr.contains("-") && timestampStr.lastIndexOf('-') > 10)) {
                // Has offset
                return ZonedDateTime.parse(timestampStr, DateTimeFormatter.ISO_DATE_TIME).toInstant();
            } else {
                // Assume NY timezone
                return ZonedDateTime.parse(timestampStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        .withZoneSameLocal(NY_ZONE)
                        .toInstant();
            }
        } catch (Exception e) {
            log.warn("Failed to parse yFinance timestamp {}: {}", timestampStr, e.getMessage());
            return Instant.now();
        }
    }

    /**
     * Normalizes Tiingo UTC string.
     */
    public Instant normalizeTiingoTimestamp(String timestampStr) {
        try {
            return Instant.parse(timestampStr);
        } catch (Exception e) {
            log.warn("Failed to parse Tiingo timestamp {}: {}", timestampStr, e.getMessage());
            return Instant.now();
        }
    }
}
