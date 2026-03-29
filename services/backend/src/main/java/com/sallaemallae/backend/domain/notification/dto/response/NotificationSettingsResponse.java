package com.sallaemallae.backend.domain.notification.dto.response;

public record NotificationSettingsResponse(
    boolean isNotiEnabled,
    boolean isEmailNotiEnabled
) {
}
