package com.ozkaslibasar.financeproject.config;

import com.ozkaslibasar.financeproject.domain.model.SmartReport;
import com.ozkaslibasar.financeproject.domain.model.SmartReportSectionStatus;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * smartReportCache (6 h) can still hold entries written before sectionStatus existed.
 * They must deserialize with a null sectionStatus and no eviction.
 */
class SmartReportCacheCompatibilityTest {

    private static final String OLD_SHAPE = """
            {"@class":"com.ozkaslibasar.financeproject.domain.model.SmartReport",
             "symbol":"AAPL","overallScore":51,"grade":"C","recommendation":"Hold",
             "breakdown":{"@class":"com.ozkaslibasar.financeproject.domain.model.SmartReport$ScoreBreakdown",
               "fundamentalScore":50,"valuationScore":null,"qualityScore":50,"growthScore":50,
               "momentumScore":50,"riskScore":50,"earningsScore":50,"sentimentScore":70},
             "peers":["java.util.ArrayList",[]]}
            """;

    @Test
    void oldRedisEntryWithoutSectionStatusDeserializesWithNull() {
        GenericJackson2JsonRedisSerializer serializer = RedisConfig.cacheValueSerializer();

        SmartReport report = (SmartReport) serializer.deserialize(OLD_SHAPE.getBytes(StandardCharsets.UTF_8));

        assertThat(report.getSymbol()).isEqualTo("AAPL");
        assertThat(report.getOverallScore()).isEqualTo(51);
        assertThat(report.getBreakdown().getSentimentScore()).isEqualTo(70);
        assertThat(report.getSectionStatus()).isNull();
    }

    @Test
    void newEntryRoundTripsThroughTheCacheSerializer() {
        GenericJackson2JsonRedisSerializer serializer = RedisConfig.cacheValueSerializer();
        SmartReport original = SmartReport.builder().symbol("AAPL").overallScore(51)
                .sectionStatus(new SmartReportSectionStatus(WatchlistResearchStatus.INSUFFICIENT_DATA,
                        java.util.Map.of("fundamental_score",
                                new SmartReportSectionStatus.Component(
                                        WatchlistResearchStatus.INSUFFICIENT_DATA, "fallback_source_used"))))
                .build();

        SmartReport copy = (SmartReport) serializer.deserialize(serializer.serialize(original));

        assertThat(copy.getSectionStatus().overall()).isEqualTo(WatchlistResearchStatus.INSUFFICIENT_DATA);
        assertThat(copy.getSectionStatus().components().get("fundamental_score").reason())
                .isEqualTo("fallback_source_used");
    }
}
