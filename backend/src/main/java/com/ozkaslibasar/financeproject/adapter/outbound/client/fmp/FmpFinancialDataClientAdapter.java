package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp;

import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpAssetProfileDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpHistoricalPriceResponseDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.mapper.FmpClientMapper;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataClientPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Adapter implementing {@link FinancialDataClientPort} using the FMP OpenFeign Client.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FmpFinancialDataClientAdapter implements FinancialDataClientPort {

    private final FmpClient fmpClient;
    private final FmpClientMapper mapper;

    @Value("${FMP_API_KEY:}")
    private String apiKey;

    @Override
    public List<PriceHistory> fetchPriceHistory(String symbol) {
        try {
            FmpHistoricalPriceResponseDto response = fmpClient.getHistoricalPrices(symbol, apiKey);
            if (response == null || response.getHistorical() == null) {
                return Collections.emptyList();
            }

            return response.getHistorical().stream()
                    .map(dto -> mapper.toDomain(dto, symbol))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Failed to fetch price history for symbol {}: {}", symbol, e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public Optional<Asset> fetchAssetInfo(String symbol) {
        try {
            List<FmpAssetProfileDto> response = fmpClient.getAssetProfile(symbol, apiKey);
            if (response == null || response.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(mapper.toDomain(response.get(0)));
        } catch (Exception e) {
            log.error("Failed to fetch asset profile for symbol {}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }
}
