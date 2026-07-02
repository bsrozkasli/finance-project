package com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.WatchlistEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WatchlistJpaRepository extends JpaRepository<WatchlistEntity, Long> {

    List<WatchlistEntity> findByUserIdOrderByIdAsc(String userId);

    Optional<WatchlistEntity> findByIdAndUserId(Long id, String userId);

    void deleteByIdAndUserId(Long id, String userId);
}
