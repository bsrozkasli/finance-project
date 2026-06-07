package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.mapper.FundamentalSnapshotPersistenceMapper;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.FundamentalSnapshotJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.FundamentalSnapshot;
import com.ozkaslibasar.financeproject.domain.port.outbound.FundamentalSnapshotPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
@Slf4j
public class FundamentalSnapshotRepositoryAdapter implements FundamentalSnapshotPort {

    private final FundamentalSnapshotJpaRepository repository;
    private final FundamentalSnapshotPersistenceMapper mapper;

    @Override
    public void save(FundamentalSnapshot snapshot) {
        if (snapshot == null) return;
        var entity = mapper.toEntity(snapshot);
        repository.save(entity);
        log.info("Persisted fundamental snapshot for {} at {}", snapshot.symbol(), snapshot.calculatedAt());
    }

    @Override
    public List<FundamentalSnapshot> findBySymbol(String symbol) {
        return repository.findBySymbolOrderByCalculatedAtDesc(symbol)
                .stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<FundamentalSnapshot> findLatest(String symbol) {
        return repository.findFirstBySymbolOrderByCalculatedAtDesc(symbol)
                .map(mapper::toDomain);
    }
}
