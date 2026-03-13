package com.sallaemallae.backend.domain.notification.dto;

public record NotificationSettingsUpdateRequest(
    Boolean isNotiEnabled,
    Boolean isEmailNotiEnabled
) {
}
