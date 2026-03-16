package com.sallaemallae.backend.domain.notification.dto;

public record NotificationSettingsResponse(
    boolean isNotiEnabled,
    boolean isEmailNotiEnabled
) {
}
