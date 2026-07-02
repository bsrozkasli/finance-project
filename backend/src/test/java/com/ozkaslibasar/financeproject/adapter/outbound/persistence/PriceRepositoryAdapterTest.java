package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class PriceRepositoryAdapterTest {

    @Autowired
    private PriceRepositoryAdapter priceRepositoryAdapter;

    @Test
    void shouldSaveAndFindLatestPrice() {
        // Arrange
        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
        LocalDateTime nowUtc = LocalDateTime.ofInstant(now, ZoneOffset.UTC);
        PriceHistory p1 = new PriceHistory("TSLA", BigDecimal.valueOf(100), BigDecimal.valueOf(105), BigDecimal.valueOf(110), BigDecimal.valueOf(90), BigDecimal.valueOf(1000), now.minusSeconds(86400));
        PriceHistory p2 = new PriceHistory("TSLA", BigDecimal.valueOf(105), BigDecimal.valueOf(102), BigDecimal.valueOf(108), BigDecimal.valueOf(100), BigDecimal.valueOf(2000), now);

        // Act
        priceRepositoryAdapter.saveAll(List.of(p1, p2));
        
        Optional<PriceHistory> latest = priceRepositoryAdapter.findLatestByAssetId("TSLA");

        // Assert
        assertThat(latest).isPresent();
        assertThat(latest.get().timestamp()).isEqualTo(nowUtc);
        assertThat(latest.get().close()).isEqualByComparingTo(BigDecimal.valueOf(102));
    }
    @Test
    void shouldUpdateExistingPriceForSameSymbolAndTimestamp() {
        Instant timestamp = Instant.now().truncatedTo(ChronoUnit.MICROS);
        PriceHistory original = new PriceHistory("NVDA", BigDecimal.valueOf(200), BigDecimal.valueOf(200), BigDecimal.valueOf(205), BigDecimal.valueOf(198), BigDecimal.valueOf(1000), timestamp);
        PriceHistory updated = new PriceHistory("NVDA", BigDecimal.valueOf(194), BigDecimal.valueOf(195), BigDecimal.valueOf(196), BigDecimal.valueOf(193), BigDecimal.valueOf(2000), timestamp);

        priceRepositoryAdapter.saveAll(List.of(original));
        priceRepositoryAdapter.saveAll(List.of(updated));

        Optional<PriceHistory> latest = priceRepositoryAdapter.findLatestByAssetId("NVDA");

        assertThat(latest).isPresent();
        assertThat(latest.get().close()).isEqualByComparingTo(BigDecimal.valueOf(195));
        assertThat(latest.get().volume()).isEqualByComparingTo(BigDecimal.valueOf(2000));
    }
}

