package com.sallaemallae.backend.domain.notification.dto.request;

public record NotificationSettingsUpdateRequest(
    Boolean isNotiEnabled,
    Boolean isEmailNotiEnabled
) {
}
