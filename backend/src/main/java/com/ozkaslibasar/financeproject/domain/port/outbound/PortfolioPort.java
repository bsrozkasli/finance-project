package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.Portfolio;

import java.util.List;
import java.util.Optional;

public interface PortfolioPort {

    List<Portfolio> findByUserId(String userId);

    Optional<Portfolio> findByIdAndUserId(Long id, String userId);

    Portfolio save(Portfolio portfolio);

    void deleteByIdAndUserId(Long id, String userId);
}
