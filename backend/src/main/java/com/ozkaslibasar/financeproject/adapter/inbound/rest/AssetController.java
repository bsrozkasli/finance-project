package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.AssetResponseDto;
import com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper.RestMapper;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.cache.annotation.CacheEvict;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.AssetBatchRequestDto;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import java.util.ArrayList;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetRepositoryPort assetRepositoryPort;
    private final FinancialDataClientPort financialDataClientPort;
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
        List<Asset> savedAssets = new ArrayList<>();
        
        if (request.getSymbols() == null || request.getSymbols().isEmpty()) {
            return new ArrayList<>();
        }

        for (String symbol : request.getSymbols()) {
            financialDataClientPort.fetchAssetInfo(symbol).ifPresent(asset -> {
                Asset saved = assetRepositoryPort.save(asset);
                savedAssets.add(saved);
                
                // Immediately fetch initial price history so chart can render
                List<PriceHistory> prices = financialDataClientPort.fetchPriceHistory(symbol);
                if (!prices.isEmpty()) {
                    priceRepositoryPort.saveAll(prices);
                }
            });
        }
        
        return mapper.toAssetResponseDtoList(savedAssets);
    }
}
