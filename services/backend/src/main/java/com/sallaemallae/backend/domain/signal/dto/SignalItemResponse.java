package com.sallaemallae.backend.domain.signal.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SignalItemResponse(
    @Schema(description = "종목 ID", example = "1")
    Long stockId,
    @Schema(description = "종목 코드", example = "005930")
    String ticker,
    @Schema(description = "종목명", example = "삼성전자")
    String name,
    @Schema(description = "현재가", example = "74300")
    Integer price,
    @Schema(description = "등락률", example = "1.24")
    Float fluctuationRate,
    @Schema(description = "AI 매매신호", example = "BUY")
    String signal,
    @Schema(description = "AI 신뢰도", example = "98")
    Integer confidence,
    @Schema(description = "리포트 생성 시각")
    OffsetDateTime createdAt
) {
}
