package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.AssetResponseDto;
import com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper.RestMapper;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.AssetBatchRequestDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
@Slf4j
public class AssetController {

    private final AssetRepositoryPort assetRepositoryPort;
    private final PriceChartClientPort priceChartClientPort;
    private final PriceRepositoryPort priceRepositoryPort;
    private final RestMapper mapper;

    @GetMapping
    @Cacheable(value = "assetsCache")
    public List<AssetResponseDto> getAllAssets() {
        var assets = assetRepositoryPort.findAll();
        return mapper.toAssetResponseDtoList(assets);
    }

    @GetMapping("/{symbol}")
    @Cacheable(value = "assetCache", key = "#symbol")
    public AssetResponseDto getAssetBySymbol(@PathVariable String symbol) {
        return assetRepositoryPort.findBySymbol(symbol)
                .map(mapper::toAssetResponseDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Asset not found"));
    }

    @PostMapping("/batch")
    @CacheEvict(value = "assetsCache", allEntries = true)
    public List<AssetResponseDto> addAssetBatch(@RequestBody AssetBatchRequestDto request) {
        if (request.getSymbols() == null || request.getSymbols().isEmpty()) {
            return new ArrayList<>();
        }

        List<Asset> savedAssets = new ArrayList<>();

        for (String rawSymbol : request.getSymbols()) {
            if (rawSymbol == null || rawSymbol.isBlank()) {
                log.warn("Skipping blank symbol in batch request");
                continue;
            }
            String symbol = rawSymbol.trim().toUpperCase();

            try {
                // Resolve asset metadata from Yahoo Finance via PriceChartClientPort;
                // fall back to a minimal STOCK asset when Yahoo has no data.
                Asset assetToSave = priceChartClientPort.fetchAssetInfo(symbol)
                        .orElseGet(() -> {
                            log.warn("Yahoo returned no info for '{}'; persisting with default STOCK type", symbol);
                            return new Asset(symbol, symbol, AssetType.STOCK);
                        });

                Asset saved = assetRepositoryPort.save(assetToSave);
                savedAssets.add(saved);
                log.info("Persisted asset: {}", symbol);

                // Fetch initial price history; failure must not abort the whole batch
                try {
                    List<PriceHistory> prices = priceChartClientPort.fetchPriceHistory(
                            symbol, "1d", "1y");
                    if (!prices.isEmpty()) {
                        priceRepositoryPort.saveAll(prices);
                        log.info("Persisted {} price records for {}", prices.size(), symbol);
                    }
                } catch (Exception priceEx) {
                    log.warn("Could not fetch initial prices for '{}': {}", symbol, priceEx.getMessage());
                }

            } catch (Exception ex) {
                log.error("Failed to persist asset '{}': {}", symbol, ex.getMessage());
            }
        }

        return mapper.toAssetResponseDtoList(savedAssets);
    }
}

