package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.OpportunityNotification;
import com.ozkaslibasar.financeproject.domain.port.outbound.NotificationRepositoryPort;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
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

@WebMvcTest(controllers = NotificationController.class)
class NotificationControllerTest {

    private static final String BASE_PATH = "/api/v1/notifications";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NotificationRepositoryPort notificationRepositoryPort;

    @Test
    void shouldReturn200AllNotificationsArrayAndPreserveRepositoryFields() throws Exception {
        OpportunityNotification n1 = notification(1L, "AAPL", 87, "Breakout setup detected", LocalDateTime.of(2026, 7, 1, 10, 0), false);
        OpportunityNotification n2 = notification(2L, "MSFT", 61, "Risk threshold hit", LocalDateTime.of(2026, 7, 1, 11, 30), true);
        when(notificationRepositoryPort.findAll()).thenReturn(List.of(n1, n2));

        mockMvc.perform(get(BASE_PATH).accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$[0].score").value(87))
                .andExpect(jsonPath("$[0].message").value("Breakout setup detected"))
                .andExpect(jsonPath("$[0].read").value(false))
                .andExpect(jsonPath("$[1].id").value(2))
                .andExpect(jsonPath("$[1].symbol").value("MSFT"))
                .andExpect(jsonPath("$[1].read").value(true))
                .andExpect(jsonPath("$.content").doesNotExist())
                .andExpect(jsonPath("$.data").doesNotExist());

        verify(notificationRepositoryPort, times(1)).findAll();
        verifyNoMoreInteractions(notificationRepositoryPort);
    }

    @Test
    void shouldReturn200EmptyArrayWhenAllNotificationsAreEmpty() throws Exception {
        when(notificationRepositoryPort.findAll()).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH).accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string("[]"));

        verify(notificationRepositoryPort).findAll();
        verifyNoMoreInteractions(notificationRepositoryPort);
    }

    @Test
    void shouldReturn200UnreadNotificationsAndOnlyRepositoryOutput() throws Exception {
        OpportunityNotification unread = notification(11L, "NVDA", 92, "Momentum continuation", LocalDateTime.of(2026, 7, 2, 9, 15), false);
        when(notificationRepositoryPort.findUnread()).thenReturn(List.of(unread));

        mockMvc.perform(get(BASE_PATH + "/unread").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(11))
                .andExpect(jsonPath("$[0].symbol").value("NVDA"))
                .andExpect(jsonPath("$[0].score").value(92))
                .andExpect(jsonPath("$[0].read").value(false));

        verify(notificationRepositoryPort).findUnread();
        verifyNoMoreInteractions(notificationRepositoryPort);
    }

    @Test
    void shouldReturn200EmptyArrayWhenUnreadNotificationsAreEmpty() throws Exception {
        when(notificationRepositoryPort.findUnread()).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH + "/unread").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string("[]"));

        verify(notificationRepositoryPort).findUnread();
        verifyNoMoreInteractions(notificationRepositoryPort);
    }

    @Test
    void shouldTreatNullNotificationListsAsEmptyArraysByContract() throws Exception {
        when(notificationRepositoryPort.findAll()).thenReturn(null);
        when(notificationRepositoryPort.findUnread()).thenReturn(null);

        mockMvc.perform(get(BASE_PATH).accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string("[]"));

        mockMvc.perform(get(BASE_PATH + "/unread").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string("[]"));

        verify(notificationRepositoryPort).findAll();
        verify(notificationRepositoryPort).findUnread();
        verifyNoMoreInteractions(notificationRepositoryPort);
    }

    @Test
    void shouldReturn503WhenNotificationRepositoryThrowsForAllNotifications() throws Exception {
        when(notificationRepositoryPort.findAll()).thenThrow(new RuntimeException("db unavailable"));

        mockMvc.perform(get(BASE_PATH).accept(APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().string(not(containsString("java.lang"))))
                .andExpect(content().string(not(containsString("RuntimeException"))))
                .andExpect(content().string(not(containsString("SQLException"))))
                .andExpect(content().string(not(containsString("DB_PASSWORD"))));

        verify(notificationRepositoryPort).findAll();
        verifyNoMoreInteractions(notificationRepositoryPort);
    }

    @Test
    void shouldReturn503WhenNotificationRepositoryThrowsForUnreadNotifications() throws Exception {
        when(notificationRepositoryPort.findUnread()).thenThrow(new RuntimeException("db unavailable"));

        mockMvc.perform(get(BASE_PATH + "/unread").accept(APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().string(not(containsString("java.lang"))))
                .andExpect(content().string(not(containsString("RuntimeException"))))
                .andExpect(content().string(not(containsString("SQLException"))))
                .andExpect(content().string(not(containsString("DB_PASSWORD"))));

        verify(notificationRepositoryPort).findUnread();
        verifyNoMoreInteractions(notificationRepositoryPort);
    }

    @Test
    void shouldCallReadAllExactlyOnceAndReturnNoBody() throws Exception {
        mockMvc.perform(post(BASE_PATH + "/read-all").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string(""));

        verify(notificationRepositoryPort, times(1)).markAllAsRead();
        verifyNoMoreInteractions(notificationRepositoryPort);
    }

    @Test
    void shouldNotReturnFalseSuccessWhenReadAllFails() throws Exception {
        doThrow(new RuntimeException("db unavailable")).when(notificationRepositoryPort).markAllAsRead();

        int statusCode;
        try {
            statusCode = mockMvc.perform(post(BASE_PATH + "/read-all").accept(APPLICATION_JSON))
                    .andReturn()
                    .getResponse()
                    .getStatus();
        } catch (Exception ex) {
            statusCode = 500;
        }

        org.assertj.core.api.Assertions.assertThat(statusCode).isNotEqualTo(200);

        verify(notificationRepositoryPort).markAllAsRead();
        verifyNoMoreInteractions(notificationRepositoryPort);
    }

    @Test
    void shouldRejectUnsupportedRoutesAndHttpMethods() throws Exception {
        mockMvc.perform(post(BASE_PATH)).andExpect(status().is4xxClientError());
        mockMvc.perform(put(BASE_PATH)).andExpect(status().is4xxClientError());
        mockMvc.perform(delete(BASE_PATH)).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PATH + "/read-all")).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PATH + "/unknown")).andExpect(status().is4xxClientError());

        verify(notificationRepositoryPort, never()).findAll();
        verify(notificationRepositoryPort, never()).findUnread();
        verify(notificationRepositoryPort, never()).markAllAsRead();
        verifyNoMoreInteractions(notificationRepositoryPort);
    }

    @Test
    void shouldNotExposeSensitiveInternalsOnRepresentativeErrorResponse() throws Exception {
        mockMvc.perform(get(BASE_PATH + "/unknown").accept(APPLICATION_JSON))
                .andExpect(status().is4xxClientError())
                .andExpect(content().string(not(containsString("java.lang"))))
                .andExpect(content().string(not(containsString("Exception"))))
                .andExpect(content().string(not(containsString("SQLException"))))
                .andExpect(content().string(not(containsString("DB_PASSWORD"))))
                .andExpect(content().string(not(containsString("FINNHUB_API_KEY"))))
                .andExpect(content().string(not(containsString("AZURE_OPENAI"))));

        verifyNoMoreInteractions(notificationRepositoryPort);
    }

    @Test
    void shouldClarifyReadAllStatusCodeContract() {
    }

    private OpportunityNotification notification(
            Long id,
            String symbol,
            Integer score,
            String message,
            LocalDateTime createdAt,
            boolean isRead
    ) {
        return OpportunityNotification.builder()
                .id(id)
                .symbol(symbol)
                .score(score)
                .message(message)
                .createdAt(createdAt)
                .isRead(isRead)
                .build();
    }
}

