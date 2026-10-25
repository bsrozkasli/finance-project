package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.CsvImportBatch;
import com.ozkaslibasar.financeproject.domain.model.CsvImportBatchStatus;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRow;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRowStatus;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioCsvImportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PortfolioImportController.class)
class PortfolioImportControllerTest {

    private static final String BASE = "/api/v1/portfolios/1/imports";

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private PortfolioPort portfolioPort;
    @MockitoBean
    private PortfolioCsvImportService importService;

    @BeforeEach
    void portfolioExists() {
        when(portfolioPort.findByIdAndUserId(1L, "default"))
                .thenReturn(Optional.of(new Portfolio(1L, "default", "P", "USD", null, false, null, null)));
    }

    private static CsvImportBatch batch(CsvImportBatchStatus status, CsvImportRowStatus... rowStatuses) {
        java.util.ArrayList<CsvImportRow> rows = new java.util.ArrayList<>();
        for (int i = 0; i < rowStatuses.length; i++) {
            CsvImportRowStatus s = rowStatuses[i];
            boolean accepted = s == CsvImportRowStatus.ACCEPTED;
            rows.add(new CsvImportRow((long) i + 1, i + 1, "raw " + i,
                    s == CsvImportRowStatus.INVALID ? null : "csv:abc" + i, s,
                    s == CsvImportRowStatus.INVALID ? "bad date" : null, null, accepted ? 500L + i : null));
        }
        return new CsvImportBatch(9L, 1L, "default", "f".repeat(64), status,
                Instant.parse("2026-10-25T10:00:00Z"),
                status == CsvImportBatchStatus.ACCEPTED ? Instant.parse("2026-10-25T10:05:00Z") : null, rows);
    }

    @Test
    void postCsvReturns201WithStagedBatchCountsAndRows() throws Exception {
        when(importService.stage(eq(1L), eq("default"), any())).thenReturn(batch(CsvImportBatchStatus.STAGED,
                CsvImportRowStatus.VALID, CsvImportRowStatus.INVALID, CsvImportRowStatus.DUPLICATE));

        mockMvc.perform(post(BASE).contentType("text/csv").content("a,b\n1,2\n"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.batchId").value(9))
                .andExpect(jsonPath("$.portfolioId").value(1))
                .andExpect(jsonPath("$.status").value("STAGED"))
                .andExpect(jsonPath("$.fileSha256").value("f".repeat(64)))
                .andExpect(jsonPath("$.createdAt").value("2026-10-25T10:00:00Z"))
                .andExpect(jsonPath("$.acceptedAt").value(nullValue()))
                .andExpect(jsonPath("$.counts.valid").value(1))
                .andExpect(jsonPath("$.counts.invalid").value(1))
                .andExpect(jsonPath("$.counts.duplicate").value(1))
                .andExpect(jsonPath("$.counts.accepted").value(0))
                .andExpect(jsonPath("$.counts.rejected").value(0))
                .andExpect(jsonPath("$.rows[0].rowNumber").value(1))
                .andExpect(jsonPath("$.rows[0].status").value("VALID"))
                .andExpect(jsonPath("$.rows[0].originLocator").value("csv:abc0"))
                .andExpect(jsonPath("$.rows[0].transactionId").value(nullValue()))
                .andExpect(jsonPath("$.rows[1].status").value("INVALID"))
                .andExpect(jsonPath("$.rows[1].message").value("bad date"))
                .andExpect(jsonPath("$.rows[1].originLocator").value(nullValue()));

        ArgumentCaptor<byte[]> body = ArgumentCaptor.forClass(byte[].class);
        verify(importService).stage(eq(1L), eq("default"), body.capture());
        assertThat(new String(body.getValue(), StandardCharsets.UTF_8)).isEqualTo("a,b\n1,2\n");
    }

    @Test
    void postCsvAcceptsCharsetParameterOnContentType() throws Exception {
        when(importService.stage(eq(1L), eq("default"), any())).thenReturn(batch(CsvImportBatchStatus.STAGED,
                CsvImportRowStatus.VALID));

        mockMvc.perform(post(BASE).contentType("text/csv; charset=UTF-8").content("x"))
                .andExpect(status().isCreated());
    }

    @Test
    void wholeFileRejectionIs400WithStandardErrorBody() throws Exception {
        when(importService.stage(eq(1L), eq("default"), any()))
                .thenThrow(new IllegalArgumentException("missing required header: fee"));

        mockMvc.perform(post(BASE).contentType("text/csv").content("x"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("missing required header: fee"))
                .andExpect(jsonPath("$.path").value(BASE));
    }

    @Test
    void unknownPortfolioIs404ForAllThreeRoutes() throws Exception {
        when(portfolioPort.findByIdAndUserId(2L, "default")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/portfolios/2/imports").contentType("text/csv").content("x"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/portfolios/2/imports/9")).andExpect(status().isNotFound());
        mockMvc.perform(post("/api/v1/portfolios/2/imports/9/accept")).andExpect(status().isNotFound());
        verify(importService, never()).stage(any(), any(), any());
    }

    @Test
    void nonCsvContentTypeIs415() throws Exception {
        mockMvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void getReturnsBatchOr404() throws Exception {
        when(importService.find(1L, "default", 9L)).thenReturn(Optional.of(batch(CsvImportBatchStatus.STAGED,
                CsvImportRowStatus.VALID)));
        when(importService.find(1L, "default", 10L)).thenReturn(Optional.empty());

        mockMvc.perform(get(BASE + "/9"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.batchId").value(9))
                .andExpect(jsonPath("$.counts.valid").value(1));
        mockMvc.perform(get(BASE + "/10"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void acceptReturns200WithFinalRowStatusesOr404() throws Exception {
        when(importService.accept(1L, "default", 9L)).thenReturn(Optional.of(batch(CsvImportBatchStatus.ACCEPTED,
                CsvImportRowStatus.ACCEPTED, CsvImportRowStatus.REJECTED, CsvImportRowStatus.INVALID)));
        when(importService.accept(1L, "default", 10L)).thenReturn(Optional.empty());

        mockMvc.perform(post(BASE + "/9/accept"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.acceptedAt").value("2026-10-25T10:05:00Z"))
                .andExpect(jsonPath("$.counts.accepted").value(1))
                .andExpect(jsonPath("$.counts.rejected").value(1))
                .andExpect(jsonPath("$.counts.invalid").value(1))
                .andExpect(jsonPath("$.rows[0].transactionId").value(500))
                .andExpect(jsonPath("$.rows[0].status").value("ACCEPTED"));
        mockMvc.perform(post(BASE + "/10/accept")).andExpect(status().isNotFound());
    }
}
