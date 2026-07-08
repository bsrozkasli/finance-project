package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice.DataServiceChatAdapter;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ChatController.class)
class ChatControllerTest {

    private static final String ASK_PATH = "/api/v1/chat/ask";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DataServiceChatAdapter chatAdapter;

    @Test
    void shouldReturn200WithResponseFieldAndDelegateExactSymbolAndMessage() throws Exception {
        String symbol = "AAPL";
        String message = "Summarize the investment thesis";
        when(chatAdapter.askChat(symbol, message)).thenReturn("Core thesis response");

        mockMvc.perform(post(ASK_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol": "AAPL",
                                  "message": "Summarize the investment thesis"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$.response").value("Core thesis response"))
                .andExpect(jsonPath("$.message").doesNotExist())
                .andExpect(jsonPath("$.data").doesNotExist());

        ArgumentCaptor<String> symbolCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
        verify(chatAdapter).askChat(symbolCaptor.capture(), messageCaptor.capture());
        assertThat(symbolCaptor.getValue()).isEqualTo("AAPL");
        assertThat(messageCaptor.getValue()).isEqualTo("Summarize the investment thesis");
        verifyNoMoreInteractions(chatAdapter);
    }

    @Test
    void shouldRejectInvalidPayloadShapesByContractAndAvoidAdapterCalls() throws Exception {
        List<String> invalidPayloads = List.of(
                "{\"symbol\":null,\"message\":\"Summarize the investment thesis\"}",
                "{\"symbol\":\"\",\"message\":\"Summarize the investment thesis\"}",
                "{\"symbol\":\"   \",\"message\":\"Summarize the investment thesis\"}",
                "{\"symbol\":\"AAPL\",\"message\":null}",
                "{\"symbol\":\"AAPL\",\"message\":\"\"}",
                "{\"symbol\":\"AAPL\",\"message\":\"   \"}",
                "{\"message\":\"Summarize the investment thesis\"}",
                "{\"symbol\":\"AAPL\"}",
                "{}"
        );

        List<String> nonBadRequestStatuses = new ArrayList<>();
        for (String payload : invalidPayloads) {
            int status = mockMvc.perform(post(ASK_PATH)
                            .contentType(APPLICATION_JSON)
                            .accept(APPLICATION_JSON)
                            .content(payload))
                    .andReturn()
                    .getResponse()
                    .getStatus();
            if (status != 400) {
                nonBadRequestStatuses.add(payload + " -> " + status);
            }
        }

        assertThat(nonBadRequestStatuses)
                .as("Invalid symbol/message payloads should be rejected with 400 by API contract")
                .isEmpty();
        verifyNoInteractions(chatAdapter);
    }

    @Test
    void shouldRejectMalformedJsonAndAvoidAdapterCalls() throws Exception {
        mockMvc.perform(post(ASK_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content("{\"symbol\":\"AAPL\",\"message\":"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(chatAdapter);
    }

    @Test
    void shouldRejectEmptyBodyAndAvoidAdapterCalls() throws Exception {
        mockMvc.perform(post(ASK_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(""))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(chatAdapter);
    }

    @Test
    void shouldRejectUnsupportedContentTypeAndAvoidAdapterCalls() throws Exception {
        mockMvc.perform(post(ASK_PATH)
                        .contentType("text/plain")
                        .accept(APPLICATION_JSON)
                        .content("symbol=AAPL&message=hello"))
                .andExpect(status().isUnsupportedMediaType());

        verifyNoInteractions(chatAdapter);
    }

    @Test
    void shouldReturnNullResponseWhenAdapterReturnsNullWithoutFabrication() throws Exception {
        when(chatAdapter.askChat("AAPL", "Summarize the investment thesis")).thenReturn(null);

        mockMvc.perform(post(ASK_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol": "AAPL",
                                  "message": "Summarize the investment thesis"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.response").value(nullValue()))
                .andExpect(content().string(not(containsString("Could not get response"))))
                .andExpect(content().string(not(containsString("An error occurred while connecting to the AI assistant"))));

        verify(chatAdapter).askChat("AAPL", "Summarize the investment thesis");
        verifyNoMoreInteractions(chatAdapter);
    }

    @Test
    void shouldReturnBlankResponseWhenAdapterReturnsBlankWithoutFabrication() throws Exception {
        when(chatAdapter.askChat("AAPL", "Summarize the investment thesis")).thenReturn("   ");

        mockMvc.perform(post(ASK_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol": "AAPL",
                                  "message": "Summarize the investment thesis"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.response").value("   "))
                .andExpect(content().string(not(containsString("Could not get response"))))
                .andExpect(content().string(not(containsString("An error occurred while connecting to the AI assistant"))));

        verify(chatAdapter).askChat("AAPL", "Summarize the investment thesis");
        verifyNoMoreInteractions(chatAdapter);
    }

    @Test
    void shouldReturn503WhenDependencyThrowsByContract() throws Exception {
        when(chatAdapter.askChat("AAPL", "Summarize the investment thesis"))
                .thenThrow(new RuntimeException("upstream unavailable"));

        mockMvc.perform(post(ASK_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol": "AAPL",
                                  "message": "Summarize the investment thesis"
                                }
                                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().string(not(containsString("java.lang"))))
                .andExpect(content().string(not(containsString("RuntimeException"))))
                .andExpect(content().string(not(containsString("AZURE_OPENAI"))))
                .andExpect(content().string(not(containsString("FINNHUB_API_KEY"))))
                .andExpect(content().string(not(containsString("DB_PASSWORD"))));
    }

    @Test
    void shouldRejectUnsupportedRoutesAndHttpMethods() throws Exception {
        mockMvc.perform(get(ASK_PATH)).andExpect(status().is4xxClientError());
        mockMvc.perform(put(ASK_PATH)).andExpect(status().is4xxClientError());
        mockMvc.perform(delete(ASK_PATH)).andExpect(status().is4xxClientError());
        mockMvc.perform(post("/api/v1/chat")).andExpect(status().is4xxClientError());
        mockMvc.perform(post("/api/v1/chat/ask/extra")).andExpect(status().is4xxClientError());

        verify(chatAdapter, never()).askChat(anyString(), anyString());
        verifyNoMoreInteractions(chatAdapter);
    }

    @Test
    void shouldNotExposeSensitiveInternalsOnRepresentativeErrorResponse() throws Exception {
        mockMvc.perform(post(ASK_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content("{\"symbol\":\"AAPL\",\"message\":"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(not(containsString("java.lang"))))
                .andExpect(content().string(not(containsString("SQLException"))))
                .andExpect(content().string(not(containsString("DB_PASSWORD"))))
                .andExpect(content().string(not(containsString("FINNHUB_API_KEY"))))
                .andExpect(content().string(not(containsString("AZURE_OPENAI"))));

        verifyNoInteractions(chatAdapter);
    }

    @Test
    void shouldClarifyStableErrorSchemaOwnershipForChatController() {
    }
}
