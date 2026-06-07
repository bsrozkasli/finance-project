package com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub;

import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubRecommendationDto;
import com.ozkaslibasar.financeproject.domain.model.AgentSentimentSnapshot;
import com.ozkaslibasar.financeproject.domain.port.outbound.SentimentDataPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Adapter implementing {@link SentimentDataPort} by fetching analyst
 * recommendation trends from Finnhub via the resilience-hardened {@link FinnhubClient}.
 *
 * <p>Resilience4j policies (rate limiting, retry, circuit breaker, bulkhead) are
 * applied inside {@link FinnhubClient}, so no annotations are needed here.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FinnhubSentimentAdapter implements SentimentDataPort {

    private final FinnhubClient finnhubClient;

    @Override
    public Optional<AgentSentimentSnapshot> fetchSentiment(String symbol) {
        List<FinnhubRecommendationDto> rows = finnhubClient.getRecommendations(symbol);

        if (rows == null || rows.isEmpty()) {
            log.info("FinnhubSentimentAdapter: no recommendations for {}; using neutral", symbol);
            return Optional.of(neutralSnapshot());
        }

        FinnhubRecommendationDto latest = rows.get(0);
        int strongBuy  = latest.getStrongBuy();
        int buy        = latest.getBuy();
        int hold       = latest.getHold();
        int sell       = latest.getSell();
        int strongSell = latest.getStrongSell();

        double bullish = strongBuy + buy;
        double bearish = sell + strongSell;
        double total   = bullish + bearish + hold;

        double analystScore = total == 0 ? 0 : (bullish - bearish) / total;
        String consensus    = analystScore > 0.2 ? "buy" : analystScore < -0.2 ? "sell" : "hold";
        int sentimentScore  = (int) Math.round(50 + analystScore * 50);

        return Optional.of(new AgentSentimentSnapshot(
                0.0,
                "neutral",
                analystScore,
                consensus,
                Math.max(0, Math.min(100, sentimentScore))
        ));
    }

    private AgentSentimentSnapshot neutralSnapshot() {
        return new AgentSentimentSnapshot(0, "neutral", 0, "hold", 50);
    }
}

