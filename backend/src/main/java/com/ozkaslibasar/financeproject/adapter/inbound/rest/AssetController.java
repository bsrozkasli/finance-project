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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetRepositoryPort assetRepositoryPort;
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
}
