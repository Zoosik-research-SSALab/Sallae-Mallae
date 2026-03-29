package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ReportHistoryItemResponse(
    @Schema(description = "리포트 기준 일자")
    LocalDate date,
    @Schema(description = "의장 AI 최종 분석 결과")
    ChairmanReportResponse chairman,
    @Schema(description = "위원회 심층 토론 기록")
    DebateResponse debate
) {
}
