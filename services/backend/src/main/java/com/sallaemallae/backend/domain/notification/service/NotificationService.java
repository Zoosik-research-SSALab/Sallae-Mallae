package com.sallaemallae.backend.domain.notification.service;

import com.sallaemallae.backend.domain.notification.dto.NotificationItemResponse;
import com.sallaemallae.backend.global.response.CursorPageResponse;

public interface NotificationService {

  CursorPageResponse<NotificationItemResponse> getNotifications(Long userId, Long cursor, int size);
}
