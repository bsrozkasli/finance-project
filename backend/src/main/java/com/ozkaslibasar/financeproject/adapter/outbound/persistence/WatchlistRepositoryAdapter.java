package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.WatchlistEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.WatchlistJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.Watchlist;
import com.ozkaslibasar.financeproject.domain.port.outbound.WatchlistPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class WatchlistRepositoryAdapter implements WatchlistPort {

    private final WatchlistJpaRepository jpaRepository;

    @Override
    public List<Watchlist> findByUserId(String userId) {
        return jpaRepository.findByUserIdOrderByIdAsc(userId)
                .stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public Optional<Watchlist> findByIdAndUserId(Long id, String userId) {
        return jpaRepository.findByIdAndUserId(id, userId).map(this::toDomain);
    }

    @Override
    public Watchlist save(Watchlist watchlist) {
        return toDomain(jpaRepository.save(toEntity(watchlist)));
    }

    @Override
    @Transactional
    public void deleteByIdAndUserId(Long id, String userId) {
        jpaRepository.deleteByIdAndUserId(id, userId);
    }

    private Watchlist toDomain(WatchlistEntity e) {
        return new Watchlist(
                e.getId(),
                e.getUserId(),
                e.getName(),
                List.copyOf(e.getSymbols()),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }

    private WatchlistEntity toEntity(Watchlist watchlist) {
        WatchlistEntity e = new WatchlistEntity();
        if (watchlist.id() != null) {
            e.setId(watchlist.id());
        }
        e.setUserId(watchlist.userId());
        e.setName(watchlist.name());
        e.setSymbols(watchlist.symbols());
        return e;
    }
}
