package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.PortfolioPosition;

import java.util.List;
import java.util.Optional;

/**
 * Outbound port for persisting and retrieving portfolio positions.
 */
public interface PortfolioPositionPort {

    List<PortfolioPosition> findByUserId(String userId);

    Optional<PortfolioPosition> findByIdAndUserId(Long id, String userId);

    PortfolioPosition save(PortfolioPosition position);

    void deleteByIdAndUserId(Long id, String userId);
}
