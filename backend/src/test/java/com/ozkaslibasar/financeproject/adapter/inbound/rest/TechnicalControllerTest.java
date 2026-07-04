package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TechnicalController.class)
class TechnicalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TechnicalAnalysisPort technicalAnalysisPort;

    @Test
    void shouldReturn422WhenTechnicalAnalysisHasInsufficientCandles() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalAnalysis("AAPL", "1d", "1mo"))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "At least 30 candles are required for technical analysis"));

        mockMvc.perform(get("/api/v1/technical/AAPL?interval=1d&range=1mo"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void shouldReturn422WhenTechnicalSignalsHaveInsufficientCandles() throws Exception {
        when(technicalAnalysisPort.fetchTechnicalSignals("AAPL", "1d", "1mo"))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "At least 30 candles are required for technical analysis"));

        mockMvc.perform(get("/api/v1/technical/AAPL/signals?interval=1d&range=1mo"))
                .andExpect(status().isUnprocessableEntity());
    }
}
