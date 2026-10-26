package com.ozkaslibasar.financeproject.config;

import com.ozkaslibasar.financeproject.domain.model.SmartReport;
import com.ozkaslibasar.financeproject.domain.model.SmartReportSectionStatus;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;

import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort;
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

    @Test
    void reportWithPeersRoundTripsThroughTheCacheSerializer() {
        GenericJackson2JsonRedisSerializer serializer = RedisConfig.cacheValueSerializer();
        SmartReport original = SmartReport.builder().symbol("AAPL").overallScore(51)
                .peers(java.util.List.of(
                        SmartReport.PeerComparison.builder().symbol("AAPL").peRatio(20.0).roe(0.3).build(),
                        SmartReport.PeerComparison.builder().symbol("MSFT").pbRatio(9.5).build()))
                .build();

        SmartReport copy = (SmartReport) serializer.deserialize(serializer.serialize(original));

        assertThat(copy.getPeers()).hasSize(2);
        assertThat(copy.getPeers().get(0).getPeRatio()).isEqualTo(20.0);
        assertThat(copy.getPeers().get(0).getPbRatio()).isNull();
        assertThat(copy.getPeers().get(1).getSymbol()).isEqualTo("MSFT");
        assertThat(copy.getPeers().get(1).getPbRatio()).isEqualTo(9.5);
    }

    private static SmartReportScorePort.CompositeScore composite() {
        return new SmartReportScorePort.CompositeScore(
                51, "C", "Hold",
                new SmartReportScorePort.ScoreBreakdown(50, null, 50, 50, 50, 50, 50, 70),
                java.util.Map.of("valuation_score",
                        new SmartReportScorePort.ComponentAvailability("unavailable", "valuation_component_unavailable")),
                java.util.List.of("valuation"));
    }

    @Test
    void compositeScoreRoundTripsThroughTheCacheSerializer() {
        GenericJackson2JsonRedisSerializer serializer = RedisConfig.cacheValueSerializer();

        Object copy = serializer.deserialize(serializer.serialize(composite()));

        assertThat(copy).isEqualTo(composite());
    }

    @Test
    void oldShapeCompositeScoreWithoutAvailabilityFieldsStillLoads() throws Exception {
        GenericJackson2JsonRedisSerializer serializer = RedisConfig.cacheValueSerializer();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        com.fasterxml.jackson.databind.node.ObjectNode json =
                (com.fasterxml.jackson.databind.node.ObjectNode) mapper.readTree(serializer.serialize(composite()));
        json.remove("breakdownAvailability");
        json.remove("unavailableComponents");

        SmartReportScorePort.CompositeScore old =
                (SmartReportScorePort.CompositeScore) serializer.deserialize(mapper.writeValueAsBytes(json));

        assertThat(old.overallScore()).isEqualTo(51);
        assertThat(old.breakdown().sentimentScore()).isEqualTo(70);
        assertThat(old.breakdownAvailability()).isNull();
        assertThat(old.unavailableComponents()).isNull();
    }
}
