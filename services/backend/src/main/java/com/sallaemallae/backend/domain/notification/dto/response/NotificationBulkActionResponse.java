package com.sallaemallae.backend.domain.notification.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "알림 일괄 처리 응답")
public record NotificationBulkActionResponse(
    @Schema(description = "처리 결과 메시지", example = "전체 읽음 처리 완료")
    String message,
    @Schema(description = "처리된 알림 개수", example = "2")
    long count
) {
}
