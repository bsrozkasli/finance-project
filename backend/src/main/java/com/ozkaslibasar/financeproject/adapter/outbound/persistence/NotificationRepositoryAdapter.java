package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.OpportunityNotificationEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.OpportunityNotificationJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.OpportunityNotification;
import com.ozkaslibasar.financeproject.domain.port.outbound.NotificationRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class NotificationRepositoryAdapter implements NotificationRepositoryPort {

    private final OpportunityNotificationJpaRepository repository;

    @Override
    @Transactional
    public OpportunityNotification save(OpportunityNotification notification) {
        OpportunityNotificationEntity entity = OpportunityNotificationEntity.builder()
                .symbol(notification.getSymbol())
                .score(notification.getScore())
                .message(notification.getMessage())
                .createdAt(notification.getCreatedAt())
                .isRead(notification.isRead())
                .build();
        OpportunityNotificationEntity saved = repository.save(entity);
        return mapToDomain(saved);
    }

    @Override
    public List<OpportunityNotification> findAll() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<OpportunityNotification> findUnread() {
        return repository.findByIsReadFalseOrderByCreatedAtDesc().stream()
                .map(this::mapToDomain)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void markAllAsRead() {
        List<OpportunityNotificationEntity> unread = repository.findByIsReadFalseOrderByCreatedAtDesc();
        for (OpportunityNotificationEntity entity : unread) {
            entity.setRead(true);
        }
        repository.saveAll(unread);
    }

    private OpportunityNotification mapToDomain(OpportunityNotificationEntity entity) {
        return OpportunityNotification.builder()
                .id(entity.getId())
                .symbol(entity.getSymbol())
                .score(entity.getScore())
                .message(entity.getMessage())
                .createdAt(entity.getCreatedAt())
                .isRead(entity.isRead())
                .build();
    }
}
