package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper.RestMapper;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetMetadataStatus;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.service.AssetResolutionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
    controllers = AssetController.class,
    includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = RestMapper.class)
)
class AssetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AssetRepositoryPort assetRepositoryPort;

    @MockitoBean
    private AssetResolutionService assetResolutionService;

    @MockitoBean
    private PriceChartClientPort priceChartClientPort;

    @MockitoBean
    private PriceRepositoryPort priceRepositoryPort;

    @Test
    void shouldReturnAllAssets() throws Exception {
        Asset asset1 = new Asset("AAPL", "Apple Inc.", AssetType.STOCK);
        Asset asset2 = new Asset("TSLA", "Tesla Inc.", AssetType.STOCK);

        when(assetRepositoryPort.findAll()).thenReturn(List.of(asset1, asset2));

        mockMvc.perform(get("/api/v1/assets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$[1].symbol").value("TSLA"));
    }

    @Test
    void shouldReturnAssetWhenFound() throws Exception {
        Asset asset = new Asset("MSFT", "Microsoft", AssetType.STOCK);

        when(assetRepositoryPort.findBySymbol("MSFT")).thenReturn(Optional.of(asset));

        mockMvc.perform(get("/api/v1/assets/MSFT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("MSFT"))
                .andExpect(jsonPath("$.name").value("Microsoft"));
    }

    @Test
    void shouldReturn404WhenAssetNotFound() throws Exception {
        when(assetRepositoryPort.findBySymbol("UNKNOWN")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/assets/UNKNOWN"))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldBatchAddResolvedEtfWithMetadataStatus() throws Exception {
        Asset dram = new Asset(
                "DRAM",
                "Roundhill Memory ETF",
                AssetType.ETF,
                "NYSEARCA",
                "USD",
                "YAHOO",
                "DRAM",
                AssetMetadataStatus.PARTIAL);
        // Mock rationale: resolver, repository, and provider are I/O/application boundaries in controller slice test.
        when(assetResolutionService.resolve("DRAM")).thenReturn(dram);
        when(assetRepositoryPort.save(any(Asset.class))).thenReturn(dram);
        when(priceChartClientPort.fetchPriceHistory("DRAM", "1d", "1y")).thenReturn(List.of());

        mockMvc.perform(post("/api/v1/assets/batch")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"symbols\":[\"dram\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].symbol").value("DRAM"))
                .andExpect(jsonPath("$[0].name").value("Roundhill Memory ETF"))
                .andExpect(jsonPath("$[0].type").value("ETF"))
                .andExpect(jsonPath("$[0].exchange").value("NYSEARCA"))
                .andExpect(jsonPath("$[0].currency").value("USD"))
                .andExpect(jsonPath("$[0].metadataStatus").value("PARTIAL"));
    }
}
