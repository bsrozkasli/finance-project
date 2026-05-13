package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PriceRepositoryAdapterTest {

    @Autowired
    private PriceRepositoryAdapter priceRepositoryAdapter;

    @Test
    void shouldSaveAndFindLatestPrice() {
        // Arrange
        Instant now = Instant.now();
        PriceHistory p1 = new PriceHistory("TSLA", BigDecimal.valueOf(100), BigDecimal.valueOf(105), BigDecimal.valueOf(110), BigDecimal.valueOf(90), BigDecimal.valueOf(1000), now.minusSeconds(86400));
        PriceHistory p2 = new PriceHistory("TSLA", BigDecimal.valueOf(105), BigDecimal.valueOf(102), BigDecimal.valueOf(108), BigDecimal.valueOf(100), BigDecimal.valueOf(2000), now);

        // Act
        priceRepositoryAdapter.saveAll(List.of(p1, p2));
        
        Optional<PriceHistory> latest = priceRepositoryAdapter.findLatestByAssetId("TSLA");

        // Assert
        assertThat(latest).isPresent();
        assertThat(latest.get().timestamp()).isEqualTo(now);
        assertThat(latest.get().close()).isEqualByComparingTo(BigDecimal.valueOf(102));
    }
}
