package com.ozkaslibasar.financeproject.adapter.outbound.persistence.mapper;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.AssetEntity;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

/**
 * MapStruct mapper for converting between {@link Asset} and {@link AssetEntity}.
 */
@Mapper(componentModel = "spring")
public interface AssetPersistenceMapper {

    @Mapping(source = "type", target = "type", qualifiedByName = "mapAssetTypeToString")
    AssetEntity toEntity(Asset domain);

    @Mapping(source = "type", target = "type", qualifiedByName = "mapStringToAssetType")
    Asset toDomain(AssetEntity entity);

    @Named("mapAssetTypeToString")
    default String mapAssetTypeToString(AssetType type) {
        return type != null ? type.name() : null;
    }

    @Named("mapStringToAssetType")
    default AssetType mapStringToAssetType(String typeStr) {
        return typeStr != null ? AssetType.valueOf(typeStr) : null;
    }
}
