package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.AssetResponseDto;
import com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper.RestMapper;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<List<AssetResponseDto>> getAllAssets() {
        var assets = assetRepositoryPort.findAll();
        return ResponseEntity.ok(mapper.toAssetResponseDtoList(assets));
    }

    @GetMapping("/{symbol}")
    @Cacheable(value = "assetCache", key = "#symbol")
    public ResponseEntity<AssetResponseDto> getAssetBySymbol(@PathVariable String symbol) {
        return assetRepositoryPort.findBySymbol(symbol)
                .map(mapper::toAssetResponseDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
