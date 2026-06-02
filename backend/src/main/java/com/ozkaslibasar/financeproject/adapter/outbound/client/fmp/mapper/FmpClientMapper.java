package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.mapper;

import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpAssetProfileDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpHistoricalPriceDto;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Mapper(componentModel = "spring")
public interface FmpClientMapper {

    /**
     * Maps the stable /search-symbol response to our domain Asset.
     * 'name' field is used directly (was 'companyName' in old v3 profile endpoint).
     * AssetType is derived from the exchange name since the stable API has no isEtf flag.
     */
    @Mapping(target = "name", source = "name")
    @Mapping(target = "type", source = "exchangeFullName", qualifiedByName = "mapExchangeToAssetType")
    Asset toDomain(FmpAssetProfileDto dto);

    @Mapping(target = "symbol", source = "assetId")
    @Mapping(target = "timestamp", source = "dto.date", qualifiedByName = "mapDateStringToLocalDateTime")
    PriceHistory toDomain(FmpHistoricalPriceDto dto, String assetId);

    @Named("mapExchangeToAssetType")
    default AssetType mapExchangeToAssetType(String exchangeFullName) {
        if (exchangeFullName == null) return AssetType.STOCK;
        String upper = exchangeFullName.toUpperCase();
        if (upper.contains("ETF")) return AssetType.ETF;
        return AssetType.STOCK;
    }

    @Named("mapDateStringToLocalDateTime")
    default LocalDateTime mapDateStringToLocalDateTime(String dateStr) {
        if (dateStr == null) return null;
        // FMP stable date format is "YYYY-MM-DD"
        return LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE)
                .atStartOfDay();
    }
}
