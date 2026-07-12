package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.mapper.SymbolMappingPersistenceMapper;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.SymbolMappingJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.SymbolMapping;
import com.ozkaslibasar.financeproject.domain.model.SymbolMappingStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.SymbolMappingPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class SymbolMappingRepositoryAdapter implements SymbolMappingPort {

    private final SymbolMappingJpaRepository repository;
    private final SymbolMappingPersistenceMapper mapper;

    @Override
    public Optional<SymbolMapping> findBestMapping(String canonicalSymbol, String provider) {
        if (canonicalSymbol == null || canonicalSymbol.isBlank() || provider == null || provider.isBlank()) {
            return Optional.empty();
        }
        return repository.findFirstByCanonicalSymbolAndProviderAndStatusInOrderByPriorityAsc(
                        canonicalSymbol.trim().toUpperCase(Locale.ROOT),
                        provider.trim().toUpperCase(Locale.ROOT),
                        List.of(SymbolMappingStatus.MANUAL_OVERRIDE.name(), SymbolMappingStatus.ACTIVE.name()))
                .map(mapper::toDomain);
    }
}
