package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.Watchlist;

import java.util.List;
import java.util.Optional;

public interface WatchlistPort {

    List<Watchlist> findByUserId(String userId);

    Optional<Watchlist> findByIdAndUserId(Long id, String userId);

    Watchlist save(Watchlist watchlist);

    void deleteByIdAndUserId(Long id, String userId);
}
