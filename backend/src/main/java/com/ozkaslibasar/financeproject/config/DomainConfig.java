package com.ozkaslibasar.financeproject.config;

import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.service.PriceIngestionUseCase;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration to register pure domain services as Spring Beans.
 *
 * <p>This allows the domain layer to remain free of Spring annotations like {@code @Service},
 * while still participating in dependency injection.</p>
 */
@Configuration
public class DomainConfig {

    @Bean
    public PriceIngestionUseCase priceIngestionUseCase(
            AssetRepositoryPort assetRepositoryPort,
            PriceRepositoryPort priceRepositoryPort,
            FinancialDataClientPort financialDataClientPort) {
        return new PriceIngestionUseCase(assetRepositoryPort, priceRepositoryPort, financialDataClientPort);
    }
}
