package com.ozkaslibasar.financeproject.config;

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
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(60))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));

        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();
        
        // Fast-changing data (prices) - 5 minutes
        cacheConfigs.put("priceCache", defaultConfig.entryTtl(Duration.ofMinutes(5)));
        
        // Medium-changing data (indicators, news) - 30 to 60 minutes
        cacheConfigs.put("indicatorCache", defaultConfig.entryTtl(Duration.ofMinutes(60)));
        cacheConfigs.put("newsCache", defaultConfig.entryTtl(Duration.ofMinutes(30)));
        
        // Slow-changing data (fundamentals, asset list) - 24 hours
        cacheConfigs.put("fundamentalCache", defaultConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigs.put("assetsCache", defaultConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigs.put("assetCache", defaultConfig.entryTtl(Duration.ofHours(24)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}
