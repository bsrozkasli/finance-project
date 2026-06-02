package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AssetRepositoryAdapterTest {

    @Autowired
    private AssetRepositoryAdapter assetRepositoryAdapter;

    @Test
    void shouldSaveAndRetrieveAsset() {
        // Arrange
        Asset newAsset = new Asset("AAPL", "Apple Inc.", AssetType.STOCK);

        // Act
        Asset savedAsset = assetRepositoryAdapter.save(newAsset);

        // Assert
        assertThat(savedAsset).isNotNull();
        assertThat(savedAsset.symbol()).isEqualTo("AAPL");

        // Act - retrieve
        Optional<Asset> retrieved = assetRepositoryAdapter.findBySymbol("AAPL");

        // Assert
        assertThat(retrieved).isPresent();
        assertThat(retrieved.get().name()).isEqualTo("Apple Inc.");
        assertThat(retrieved.get().type()).isEqualTo(AssetType.STOCK);
    }
}
