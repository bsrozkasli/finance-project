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
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Mapper(componentModel = "spring")
public interface FmpClientMapper {

    @Mapping(target = "name", source = "companyName")
    @Mapping(target = "type", source = "etf", qualifiedByName = "mapEtfToAssetType")
    Asset toDomain(FmpAssetProfileDto dto);

    @Mapping(target = "assetId", source = "assetId")
    @Mapping(target = "timestamp", source = "dto.date", qualifiedByName = "mapDateStringToInstant")
    PriceHistory toDomain(FmpHistoricalPriceDto dto, String assetId);

    @Named("mapEtfToAssetType")
    default AssetType mapEtfToAssetType(boolean isEtf) {
        return isEtf ? AssetType.ETF : AssetType.STOCK;
    }

    @Named("mapDateStringToInstant")
    default java.time.Instant mapDateStringToInstant(String dateStr) {
        if (dateStr == null) return null;
        // FMP date format is typically "YYYY-MM-DD"
        return LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE)
                .atStartOfDay(ZoneOffset.UTC)
                .toInstant();
    }
}
