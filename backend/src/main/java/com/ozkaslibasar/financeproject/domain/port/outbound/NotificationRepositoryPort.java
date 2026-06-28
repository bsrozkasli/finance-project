package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.OpportunityNotification;

import java.util.List;

public interface NotificationRepositoryPort {
    OpportunityNotification save(OpportunityNotification notification);
    List<OpportunityNotification> findAll();
    List<OpportunityNotification> findUnread();
    void markAllAsRead();
}
