package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.OpportunityNotification;
import com.ozkaslibasar.financeproject.domain.port.outbound.NotificationRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepositoryPort notificationRepositoryPort;

    @GetMapping
    public ResponseEntity<List<OpportunityNotification>> getAllNotifications() {
        return ResponseEntity.ok(notificationRepositoryPort.findAll());
    }

    @GetMapping("/unread")
    public ResponseEntity<List<OpportunityNotification>> getUnreadNotifications() {
        return ResponseEntity.ok(notificationRepositoryPort.findUnread());
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        notificationRepositoryPort.markAllAsRead();
        return ResponseEntity.ok().build();
    }
}
