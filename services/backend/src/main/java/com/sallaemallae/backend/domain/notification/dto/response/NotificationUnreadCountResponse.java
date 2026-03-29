package com.sallaemallae.backend.domain.notification.dto.response;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "미확인 알림 수 응답")
public record NotificationUnreadCountResponse(
    @Schema(description = "미확인 알림 수", example = "99+")
    String totalCount
) {
}
