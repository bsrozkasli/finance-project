package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ozkaslibasar.financeproject.contract.ContractFixtures;
import com.ozkaslibasar.financeproject.domain.model.SmartReport;
import com.ozkaslibasar.financeproject.domain.model.SmartReportSectionStatus;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import com.ozkaslibasar.financeproject.domain.usecase.SmartReportUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SmartReportController.class)
class SmartReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SmartReportUseCase smartReportUseCase;

    private static SmartReport.ScoreBreakdown breakdown() {
        return SmartReport.ScoreBreakdown.builder()
                .fundamentalScore(50).valuationScore(null).qualityScore(50).growthScore(50)
                .momentumScore(50).riskScore(50).earningsScore(50).sentimentScore(70).build();
    }

    private static SmartReport.PeerComparison peer() {
        return SmartReport.PeerComparison.builder().symbol("AAPL").peRatio(20.0).pbRatio(3.0)
                .debtToEquity(0.5).netProfitMargin(0.2).roe(0.3).build();
    }

    private JsonNode fetchJson(String symbol) throws Exception {
        String body = mockMvc.perform(get("/api/v1/reports/smart/" + symbol))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return new ObjectMapper().readTree(body);
    }

    @Test
    void servesSectionStatusWithNullsAndKeepsExistingFields() throws Exception {
        Map<String, SmartReportSectionStatus.Component> components = new LinkedHashMap<>();
        components.put("fundamental_score", new SmartReportSectionStatus.Component(WatchlistResearchStatus.OK, null));
        components.put("valuation_score",
                new SmartReportSectionStatus.Component(WatchlistResearchStatus.EMPTY, "valuation_component_unavailable"));
        components.put("growth_score", new SmartReportSectionStatus.Component(null, "odd"));
        when(smartReportUseCase.getSmartReport("AAPL")).thenReturn(SmartReport.builder()
                .symbol("AAPL").overallScore(51).grade("C").recommendation("Hold")
                .breakdown(breakdown()).peers(List.of(peer()))
                .sectionStatus(new SmartReportSectionStatus(WatchlistResearchStatus.EMPTY, components))
                .build());

        JsonNode json = fetchJson("AAPL");

        assertThat(json.get("symbol").asText()).isEqualTo("AAPL");
        assertThat(json.get("overallScore").asInt()).isEqualTo(51);
        assertThat(json.get("grade").asText()).isEqualTo("C");
        assertThat(json.get("recommendation").asText()).isEqualTo("Hold");
        assertThat(json.get("breakdown").get("valuationScore").isNull()).isTrue();
        assertThat(json.get("peers").get(0).get("symbol").asText()).isEqualTo("AAPL");
        JsonNode section = json.get("sectionStatus");
        assertThat(section.get("overall").asText()).isEqualTo("EMPTY");
        assertThat(section.get("components").get("fundamental_score").get("status").asText()).isEqualTo("OK");
        assertThat(section.get("components").get("fundamental_score").get("reason").isNull()).isTrue();
        assertThat(section.get("components").get("valuation_score").get("reason").asText())
                .isEqualTo("valuation_component_unavailable");
        assertThat(section.get("components").get("growth_score").get("status").isNull()).isTrue();
    }

    @Test
    void sectionStatusIsExplicitJsonNullWhenUnknown() throws Exception {
        when(smartReportUseCase.getSmartReport("MSFT")).thenReturn(SmartReport.builder()
                .symbol("MSFT").breakdown(breakdown()).peers(List.of()).build());

        JsonNode json = fetchJson("MSFT");

        assertThat(json.has("sectionStatus")).isTrue();
        assertThat(json.get("sectionStatus").isNull()).isTrue();
        assertThat(json.get("overallScore").isNull()).isTrue();
    }

    @Test
    void responseMatchesSharedContractFixture() throws Exception {
        Map<String, SmartReportSectionStatus.Component> components = new LinkedHashMap<>();
        components.put("fundamental_score", new SmartReportSectionStatus.Component(WatchlistResearchStatus.OK, null));
        components.put("valuation_score",
                new SmartReportSectionStatus.Component(WatchlistResearchStatus.EMPTY, "valuation_component_unavailable"));
        when(smartReportUseCase.getSmartReport("AAPL")).thenReturn(SmartReport.builder()
                .symbol("AAPL").overallScore(51).grade("C").recommendation("Hold")
                .breakdown(breakdown()).peers(List.of(peer()))
                .sectionStatus(new SmartReportSectionStatus(WatchlistResearchStatus.EMPTY, components))
                .build());

        String body = mockMvc.perform(get("/api/v1/reports/smart/AAPL"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        ContractFixtures.assertSameShape("smart-report.json", body);
    }
}
