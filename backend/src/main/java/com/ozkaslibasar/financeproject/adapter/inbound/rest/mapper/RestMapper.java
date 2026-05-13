package com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.AssetResponseDto;
import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.PriceResponseDto;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface RestMapper {

    AssetResponseDto toAssetResponseDto(Asset asset);

    List<AssetResponseDto> toAssetResponseDtoList(List<Asset> assets);

    PriceResponseDto toPriceResponseDto(PriceHistory price);

    List<PriceResponseDto> toPriceResponseDtoList(List<PriceHistory> prices);
}
