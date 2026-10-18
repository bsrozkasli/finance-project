package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper.RestMapper;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetMetadataStatus;
import com.ozkaslibasar.financeproject.domain.model.AssetProfileBatch;
import com.ozkaslibasar.financeproject.domain.model.AssetProfileBatch;
import com.ozkaslibasar.financeproject.domain.model.AssetResearchDetail;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.service.AssetResolutionService;
import com.ozkaslibasar.financeproject.domain.service.AssetResearchDetailUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Map;
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
    private AssetResearchDetailUseCase assetResearchDetailUseCase;
    @MockitoBean
    private PriceChartClientPort priceChartClientPort;

    @MockitoBean
    private PriceRepositoryPort priceRepositoryPort;

    @Test
    void returnsBatchProfilesWithoutFailingTheWholeRequest() throws Exception {
        when(assetResearchDetailUseCase.getProfileBatch(List.of("AAPL")))
                .thenReturn(new AssetProfileBatch(Map.of(), Instant.parse("2026-07-24T12:00:00Z")));

        mockMvc.perform(post("/api/v1/assets/batch-profiles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"symbols\":[\"AAPL\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profiles").isMap());
    }
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

    @Test
    void shouldReturnPartialResearchDetailWhenOneProviderSectionIsUnavailable() throws Exception {
        AssetResearchDetail detail = new AssetResearchDetail(
                "AAPL",
                AssetResearchDetail.Section.ok("yahoo", new AssetResearchDetail.Profile(
                        "AAPL", "Apple Inc.", "NASDAQ", "USD", "Technology", "Consumer Electronics",
                        3_000L, "Designs consumer electronics and services.", "https://www.apple.com", null,
                        "United States", "EQUITY", 164000), java.time.Instant.parse("2026-07-16T10:00:00Z")),
                AssetResearchDetail.Section.empty("provider-chain", "Market quote is unavailable.", java.time.Instant.parse("2026-07-16T10:00:00Z")),
                java.time.Instant.parse("2026-07-16T10:00:00Z"));
        when(assetResearchDetailUseCase.getDetail("AAPL")).thenReturn(detail);

        mockMvc.perform(get("/api/v1/assets/AAPL/detail"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.status").value("OK"))
                .andExpect(jsonPath("$.profile.data.name").value("Apple Inc."))
                .andExpect(jsonPath("$.market.status").value("EMPTY"));
    }

}