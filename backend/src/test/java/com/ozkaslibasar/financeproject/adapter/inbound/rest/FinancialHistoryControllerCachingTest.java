package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.FinancialHistory;
import com.ozkaslibasar.financeproject.domain.model.FinancialHistoryStatus;
import com.ozkaslibasar.financeproject.domain.service.FinancialHistoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringJUnitConfig(FinancialHistoryControllerCachingTest.Config.class)
class FinancialHistoryControllerCachingTest {

    @Configuration
    @EnableCaching
    static class Config {
        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager("fundamentalCache");
        }

        @Bean
        FinancialHistoryService service() {
            return mock(FinancialHistoryService.class);
        }

        @Bean
        FinancialHistoryController controller(FinancialHistoryService service) {
            return new FinancialHistoryController(service);
        }
    }

    @Autowired
    private FinancialHistoryController controller;

    @Autowired
    private FinancialHistoryService service;

    @Autowired
    private CacheManager cacheManager;

    private void freshState() {
        reset(service);
        cacheManager.getCache("fundamentalCache").clear();
    }

    @Test
    void unavailableResultIsNeverCached() {
        freshState();
        when(service.getHistory("AAPL")).thenReturn(
                new FinancialHistory("AAPL", FinancialHistoryStatus.UNAVAILABLE, null, null, List.of()));

        controller.getHistory("AAPL");
        controller.getHistory("aapl");

        verify(service, times(2)).getHistory("AAPL");
    }

    @Test
    void availableResultIsCached() {
        freshState();
        when(service.getHistory("AAPL")).thenReturn(
                new FinancialHistory("AAPL", FinancialHistoryStatus.AVAILABLE, "USD", null, List.of()));

        assertThat(controller.getHistory("AAPL").status()).isEqualTo("AVAILABLE");
        controller.getHistory("aapl");

        verify(service, times(1)).getHistory("AAPL");
    }
}
