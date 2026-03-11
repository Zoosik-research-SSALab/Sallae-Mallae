package com.sallaemallae.backend.domain.notification.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "알림 목록 항목")
public record NotificationItemResponse(
    @Schema(description = "사용자 알림 ID", example = "11")
    Long id,
    @Schema(description = "알림 타입", example = "SIGNAL")
    String notiType,
    @Schema(description = "종목명", example = "삼성전자")
    String stockName,
    @Schema(description = "알림 메시지", example = "삼성전자 매수 신호가 도착했습니다.")
    String message,
    @Schema(description = "읽음 여부", example = "false")
    boolean isRead,
    @Schema(description = "알림 수신 시각")
    OffsetDateTime createdAt,
    @Schema(description = "종목 ID", example = "1")
    Long stockId
) {
}
