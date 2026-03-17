package com.sallaemallae.backend.domain.notification.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "알림 단건 처리 응답")
public record NotificationActionResponse(
    @Schema(description = "처리 결과 메시지", example = "읽음 처리 완료")
    String message
) {
}
