package com.sallaemallae.backend.domain.notification.service;

import com.sallaemallae.backend.domain.notification.dto.NotificationActionResponse;
import com.sallaemallae.backend.domain.notification.dto.NotificationBulkActionResponse;
import com.sallaemallae.backend.domain.notification.dto.NotificationListResponse;
import com.sallaemallae.backend.domain.notification.dto.NotificationUnreadCountResponse;

public interface NotificationService {

  NotificationUnreadCountResponse getUnreadCount(Long userId);

  NotificationListResponse getNotifications(Long userId, String tab, int offset, int limit);

  NotificationActionResponse markAsRead(Long userId, Long notificationId);

  NotificationBulkActionResponse markAllAsRead(Long userId, String tab);

  NotificationActionResponse deleteNotification(Long userId, Long notificationId);

  NotificationBulkActionResponse deleteNotifications(Long userId, String tab);
}
