package com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.AssetResponseDto;
import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.PriceResponseDto;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Mapper(componentModel = "spring")
public interface RestMapper {

    AssetResponseDto toAssetResponseDto(Asset asset);

    List<AssetResponseDto> toAssetResponseDtoList(List<Asset> assets);

    @Mapping(target = "assetId", source = "symbol")
    PriceResponseDto toPriceResponseDto(PriceHistory price);

    List<PriceResponseDto> toPriceResponseDtoList(List<PriceHistory> prices);

    default Instant map(LocalDateTime value) {
        return value == null ? null : value.toInstant(ZoneOffset.UTC);
    }
}
