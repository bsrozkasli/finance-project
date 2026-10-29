package com.ozkaslibasar.financeproject.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonPOJOBuilder;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ozkaslibasar.financeproject.domain.model.SmartReport;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
public class RedisConfig {

    /**
     * SmartReport is a framework-free Lombok-builder class with no Jackson creator, so the cache
     * reads it back through its builder; this keeps Jackson annotations out of the domain.
     * Unknown properties are ignored so entries written by another version still load.
     */
    static GenericJackson2JsonRedisSerializer cacheValueSerializer() {
        return new GenericJackson2JsonRedisSerializer()
                .configure(objectMapper -> {
                    objectMapper.registerModule(new JavaTimeModule());
                    objectMapper.addMixIn(SmartReport.class, BuilderBackedMixIn.class);
                    objectMapper.addMixIn(SmartReport.ScoreBreakdown.class, ScoreBreakdownMixIn.class);
                    objectMapper.addMixIn(SmartReport.PeerComparison.class, PeerComparisonMixIn.class);
                    objectMapper.addMixIn(SmartReport.SmartReportBuilder.class, BuilderMixIn.class);
                    objectMapper.addMixIn(SmartReport.ScoreBreakdown.ScoreBreakdownBuilder.class, BuilderMixIn.class);
                    objectMapper.addMixIn(SmartReport.PeerComparison.PeerComparisonBuilder.class, BuilderMixIn.class);
                });
    }

    @JsonDeserialize(builder = SmartReport.SmartReportBuilder.class)
    abstract static class BuilderBackedMixIn {
    }

    @JsonDeserialize(builder = SmartReport.ScoreBreakdown.ScoreBreakdownBuilder.class)
    abstract static class ScoreBreakdownMixIn {
    }

    @JsonDeserialize(builder = SmartReport.PeerComparison.PeerComparisonBuilder.class)
    abstract static class PeerComparisonMixIn {
    }

    @JsonPOJOBuilder(withPrefix = "")
    @JsonIgnoreProperties(ignoreUnknown = true)
    abstract static class BuilderMixIn {
    }

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        GenericJackson2JsonRedisSerializer valueSerializer = cacheValueSerializer();

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(60))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(valueSerializer));

        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        // Fast-changing data: latest prices must match frontend 30-60s polling. Historical candles can stay longer.
        cacheConfigs.put("latestPriceCache", defaultConfig.entryTtl(Duration.ofSeconds(30)));
        cacheConfigs.put("marketQuoteCache", defaultConfig.entryTtl(Duration.ofSeconds(30)));
        cacheConfigs.put("assetProfileCache", defaultConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigs.put("priceCache", defaultConfig.entryTtl(Duration.ofMinutes(5)));

        // Medium-changing data
        cacheConfigs.put("technicalCache", defaultConfig.entryTtl(Duration.ofMinutes(10)));
        cacheConfigs.put("indicatorCache", defaultConfig.entryTtl(Duration.ofMinutes(60)));
        cacheConfigs.put("newsCache", defaultConfig.entryTtl(Duration.ofMinutes(30)));

        // Finnhub analyst and insider data changes slowly and should protect quota.
        cacheConfigs.put("analystCache", defaultConfig.entryTtl(Duration.ofHours(6)));
        cacheConfigs.put("insiderCache", defaultConfig.entryTtl(Duration.ofHours(6)));

        // Composite reports mix slower data with news/technical signals.
        cacheConfigs.put("companyReportCache", defaultConfig.entryTtl(Duration.ofMinutes(30)));
        cacheConfigs.put("smartReportCache", defaultConfig.entryTtl(Duration.ofHours(6)));

        // Slow-changing data (fundamentals, research, asset list)
        cacheConfigs.put("fundamentalCache", defaultConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigs.put("researchCache", defaultConfig.entryTtl(Duration.ofHours(12)));
        cacheConfigs.put("assetsCache", defaultConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigs.put("assetCache", defaultConfig.entryTtl(Duration.ofHours(24)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}
