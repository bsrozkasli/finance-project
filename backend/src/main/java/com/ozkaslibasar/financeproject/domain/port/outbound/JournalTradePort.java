package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.JournalTrade;

import java.util.List;
import java.util.Optional;

public interface JournalTradePort {

    List<JournalTrade> findByUserId(String userId);

    Optional<JournalTrade> findByIdAndUserId(Long id, String userId);

    JournalTrade save(JournalTrade trade);

    void deleteByIdAndUserId(Long id, String userId);
}
