package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.Watchlist;
import com.ozkaslibasar.financeproject.domain.port.outbound.WatchlistPort;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = WatchlistController.class)
class WatchlistControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private WatchlistPort watchlistPort;

    @Test
    void shouldReturnEmptyResearchSnapshotWithoutFabricatingProviderData() throws Exception {
        when(watchlistPort.findByIdAndUserId(10L, "default"))
                .thenReturn(Optional.of(new Watchlist(10L, "default", "Core", List.of("AAPL", "MSFT"), null, null)));

        mockMvc.perform(get("/api/v1/watchlists/10/research-snapshot?limit=1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.watchlistId").value(10))
                .andExpect(jsonPath("$.watchlistName").value("Core"))
                .andExpect(jsonPath("$.rows.length()").value(1))
                .andExpect(jsonPath("$.rows[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$.rows[0].overallStatus").value("EMPTY"))
                .andExpect(jsonPath("$.rows[0].price.status").value("EMPTY"));
    }
}
