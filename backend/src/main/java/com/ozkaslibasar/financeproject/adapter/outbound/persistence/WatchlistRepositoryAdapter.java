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
        WatchlistEntity entity;
        if (watchlist.id() != null) {
            entity = jpaRepository.findById(watchlist.id()).orElseGet(WatchlistEntity::new);
        } else {
            entity = new WatchlistEntity();
        }
        
        entity.setUserId(watchlist.userId());
        entity.setName(watchlist.name());
        
        // Update collection safely for Hibernate
        entity.getSymbols().clear();
        entity.getSymbols().addAll(watchlist.symbols());
        
        return toDomain(jpaRepository.save(entity));
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
}
