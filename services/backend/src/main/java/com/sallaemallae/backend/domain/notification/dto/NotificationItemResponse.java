package com.sallaemallae.backend.domain.notification.dto;

import java.time.OffsetDateTime;

public record NotificationItemResponse(
    Long id,
    String notifyType,
    String title,
    String message,
    String linkUrl,
    boolean isRead,
    OffsetDateTime createdAt
) {
}
