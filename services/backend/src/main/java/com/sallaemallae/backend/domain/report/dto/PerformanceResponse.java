package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PerformanceResponse(
    @Schema(description = "해당 종목의 누적 수익률", example = "12.5")
    Float cumulativeReturn,
    @Schema(description = "최근 1년간 평균 수익률(%)", example = "6.4", nullable = true)
    Float averageReturn1y,
    @Schema(description = "AI 포트폴리오 승률(%)", example = "66.7")
    Float winRate,
    @Schema(description = "최근 수익률(%)", example = "1.2")
    Float recentReturn,
    @Schema(description = "현재 보유 정보", nullable = true)
    Holding holding,
    @Schema(description = "차트 데이터 목록")
    List<ChartPoint> chart
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record Holding(
      @Schema(description = "최근 매수 일시", nullable = true)
      OffsetDateTime buyDate,
      @Schema(description = "평균 매수 단가", example = "65000", nullable = true)
      Integer buyPrice,
      @Schema(description = "현재가", example = "74300", nullable = true)
      Integer currentPrice,
      @Schema(description = "보유 수량", example = "12", nullable = true)
      Long holdingQuantity,
      @Schema(description = "투자 원금", example = "780000", nullable = true)
      Long investmentAmount,
      @Schema(description = "평가 손익", example = "111600", nullable = true)
      Long evaluationProfit,
      @Schema(description = "현재 수익률", example = "14.31", nullable = true)
      Float currentReturn,
      @Schema(description = "보유 일수", example = "14", nullable = true)
      Integer holdingDays
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record ChartPoint(
      @Schema(description = "기준 일자")
      LocalDate date,
      @Schema(description = "종가 기준 가격", example = "74300")
      Integer price,
      @Schema(description = "해당 날짜 매매 마커", example = "BUY", nullable = true)
      String tradeType
  ) {
  }
}
