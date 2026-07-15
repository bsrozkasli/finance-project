package com.ozkaslibasar.financeproject.adapter.outbound.persistence.mapper;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.SymbolMappingEntity;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.SymbolMapping;
import com.ozkaslibasar.financeproject.domain.model.SymbolMappingStatus;
import org.springframework.stereotype.Component;

@Component
public class SymbolMappingPersistenceMapper {

    public SymbolMapping toDomain(SymbolMappingEntity entity) {
        return new SymbolMapping(
                entity.getCanonicalSymbol(),
                entity.getProvider(),
                entity.getProviderSymbol(),
                entity.getDisplayName(),
                AssetType.valueOf(entity.getAssetType()),
                entity.getExchange(),
                entity.getCurrency(),
                entity.getPriority(),
                SymbolMappingStatus.valueOf(entity.getStatus()),
                entity.getLastFailureReason(),
                entity.getLastResolvedAt());
    }
}
