package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@Slf4j
public class DataServiceChatAdapter {

    private final RestTemplate restTemplate;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public DataServiceChatAdapter(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String askChat(String symbol, String message) {
        try {
            String url = baseUrl + "/api/v1/chat";
            ChatRequestDto request = new ChatRequestDto();
            request.setSymbol(symbol);
            request.setMessage(message);
            
            ChatResponseDto response = restTemplate.postForObject(url, request, ChatResponseDto.class);
            return response != null ? response.getResponse() : "Could not get response.";
        } catch (Exception e) {
            log.error("Failed to ask chat for symbol={}. Reason: {}", symbol, e.getMessage());
            return "An error occurred while connecting to the AI assistant.";
        }
    }

    @Data
    public static class ChatRequestDto {
        private String symbol;
        private String message;
    }

    @Data
    public static class ChatResponseDto {
        private String response;
    }
}
