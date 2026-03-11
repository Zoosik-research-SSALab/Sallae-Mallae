package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PerformanceResponse(
    @Schema(description = "해당 종목의 현재 누적 수익률", example = "12.5")
    Float cumulativeReturn,
    @Schema(description = "AI 포트폴리오 승률(%)", example = "66.7")
    Float winRate,
    @Schema(description = "최근 수익률(%)", example = "1.2")
    Float recentReturn,
    @Schema(description = "차트 데이터 목록")
    List<ChartPoint> chart
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record ChartPoint(
      @Schema(description = "기준 일자")
      LocalDate date,
      @Schema(description = "전역 AI 포트폴리오 누적 수익률", example = "24.3")
      Float cumulativeReturn,
      @Schema(description = "해당 날짜 매매 마커", example = "BUY", nullable = true)
      String tradeType
  ) {
  }
}
