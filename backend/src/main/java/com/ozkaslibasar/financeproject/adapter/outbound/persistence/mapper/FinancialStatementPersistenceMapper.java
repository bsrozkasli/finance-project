package com.ozkaslibasar.financeproject.adapter.outbound.persistence.mapper;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.FinancialStatementEntity;
import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * MapStruct mapper isolating the {@link FinancialStatement} domain record
 * from the {@link FinancialStatementEntity} JPA entity.
 */
@Mapper(componentModel = "spring")
public interface FinancialStatementPersistenceMapper {

    /**
     * Converts a JPA entity to a pure domain record.
     * All field names are identical between entity and domain.
     */
    FinancialStatement toDomain(FinancialStatementEntity entity);

    /**
     * Converts a domain record to a JPA entity for persistence.
     *
     * <p>The {@code id} field is excluded — it is managed by the DB sequence
     * and must not be set from the domain layer.</p>
     */
    @Mapping(target = "id", ignore = true)
    FinancialStatementEntity toEntity(FinancialStatement domain);
}
