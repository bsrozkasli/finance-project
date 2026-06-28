package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.mapper.AssetPersistenceMapper;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.AssetJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Adapter implementing {@link AssetRepositoryPort} using Spring Data JPA.
 */
@Repository
@RequiredArgsConstructor
public class AssetRepositoryAdapter implements AssetRepositoryPort {

    private final AssetJpaRepository repository;
    private final AssetPersistenceMapper mapper;

    @Override
    public Optional<Asset> findBySymbol(String symbol) {
        return repository.findById(symbol)
                .map(mapper::toDomain);
    }

    @Override
    public List<Asset> findAll() {
        return repository.findAll().stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Asset save(Asset asset) {
        var entity = mapper.toEntity(asset);
        var savedEntity = repository.save(entity);
        return mapper.toDomain(savedEntity);
    }

    @Override
    public void deleteBySymbol(String symbol) {
        repository.deleteById(symbol);
    }
}
