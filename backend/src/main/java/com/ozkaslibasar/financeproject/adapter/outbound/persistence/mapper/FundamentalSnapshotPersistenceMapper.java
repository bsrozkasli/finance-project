package com.ozkaslibasar.financeproject.adapter.outbound.persistence.mapper;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.FundamentalSnapshotEntity;
import com.ozkaslibasar.financeproject.domain.model.FundamentalSnapshot;
import org.springframework.stereotype.Component;

@Component
public class FundamentalSnapshotPersistenceMapper {

    public FundamentalSnapshotEntity toEntity(FundamentalSnapshot domain) {
        if (domain == null) return null;
        return FundamentalSnapshotEntity.builder()
                .symbol(domain.symbol())
                .calculatedAt(domain.calculatedAt())
                .fiscalYear(domain.fiscalYear())
                .roa(domain.roa())
                .roe(domain.roe())
                .roic(domain.roic())
                .currentRatio(domain.currentRatio())
                .debtToEquity(domain.debtToEquity())
                .evFcf(domain.evFcf())
                .piotroskiScore(domain.piotroskiScore())
                .piotroskiSignalsJson(domain.piotroskiSignalsJson())
                .build();
    }

    public FundamentalSnapshot toDomain(FundamentalSnapshotEntity entity) {
        if (entity == null) return null;
        return new FundamentalSnapshot(
                entity.getSymbol(),
                entity.getCalculatedAt(),
                entity.getFiscalYear(),
                entity.getRoa(),
                entity.getRoe(),
                entity.getRoic(),
                entity.getCurrentRatio(),
                entity.getDebtToEquity(),
                entity.getEvFcf(),
                entity.getPiotroskiScore(),
                entity.getPiotroskiSignalsJson()
        );
    }
}
