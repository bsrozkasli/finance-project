package com.ozkaslibasar.financeproject.domain.port.outbound;

import java.util.List;

public interface MarketSessionPort {
    List<MarketSession> fetchSessions(List<String> exchanges);

    record MarketSession(String exchange, String state, String timezone, String nextOpen, String nextClose, String source) {}
}