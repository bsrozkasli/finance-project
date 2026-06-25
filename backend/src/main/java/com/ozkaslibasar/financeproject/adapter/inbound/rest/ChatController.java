package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice.DataServiceChatAdapter;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final DataServiceChatAdapter chatAdapter;

    @PostMapping("/ask")
    public ResponseEntity<ChatResponse> askChat(@RequestBody ChatRequest request) {
        String answer = chatAdapter.askChat(request.getSymbol(), request.getMessage());
        return ResponseEntity.ok(new ChatResponse(answer));
    }

    @Data
    public static class ChatRequest {
        private String symbol;
        private String message;
    }

    @Data
    public static class ChatResponse {
        private final String response;
    }
}
