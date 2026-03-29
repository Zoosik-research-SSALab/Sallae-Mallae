package com.sallaemallae.backend.domain.notification.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "알림 탭 요청")
public record NotificationTabRequest(
    @Schema(description = "알림 탭", example = "ALL")
    String tab
) {
}
