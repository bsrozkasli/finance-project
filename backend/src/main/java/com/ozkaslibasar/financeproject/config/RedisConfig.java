package com.ozkaslibasar.financeproject.config;

import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        GenericJackson2JsonRedisSerializer valueSerializer = new GenericJackson2JsonRedisSerializer()
                .configure(objectMapper -> objectMapper.registerModule(new JavaTimeModule()));

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(60))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(valueSerializer));

        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        // Fast-changing data (prices) - 5 minutes
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
