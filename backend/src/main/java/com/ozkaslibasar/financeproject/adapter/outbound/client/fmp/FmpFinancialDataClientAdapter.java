package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp;

import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpAssetProfileDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpHistoricalPriceDto;
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
 * Adapter implementing {@link FinancialDataClientPort} using the FMP stable API via OpenFeign.
 *
 * <p>Uses:
 * <ul>
 *   <li>GET /stable/search-symbol for asset metadata</li>
 *   <li>GET /stable/historical-price-eod/full for OHLCV price history</li>
 * </ul>
 * </p>
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
            log.info("Fetching price history for {} from FMP stable API", symbol);
            List<FmpHistoricalPriceDto> response = fmpClient.getHistoricalPrices(symbol, apiKey);
            if (response == null || response.isEmpty()) {
                log.warn("FMP returned empty price history for symbol: {}", symbol);
                return Collections.emptyList();
            }
            return response.stream()
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
            log.info("Fetching asset info for {} from FMP stable search-symbol API", symbol);
            List<FmpAssetProfileDto> response = fmpClient.searchSymbol(symbol, 1, apiKey);
            if (response == null || response.isEmpty()) {
                log.warn("FMP returned no results for symbol: {}", symbol);
                return Optional.empty();
            }
            // The search may return partial matches; take only if symbol matches exactly
            return response.stream()
                    .filter(dto -> symbol.equalsIgnoreCase(dto.getSymbol()))
                    .findFirst()
                    .map(mapper::toDomain);
        } catch (Exception e) {
            log.error("Failed to fetch asset info for symbol {}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }
}
