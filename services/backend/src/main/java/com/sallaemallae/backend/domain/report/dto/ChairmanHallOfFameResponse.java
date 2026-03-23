package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ChairmanHallOfFameResponse(
    @Schema(description = "예측 적중률 TOP 5")
    List<HitRateItem> hitRateTop5,
    @Schema(description = "누적 수익률 TOP 5")
    List<ReturnMetricItem> cumulativeReturnTop5,
    @Schema(description = "최대 단일 수익률 TOP 5")
    List<ReturnMetricItem> maxSingleReturnTop5,
    @Schema(description = "매매당 평균 수익률 TOP 5")
    List<ReturnMetricItem> averageReturnTop5
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record HitRateItem(
      @Schema(description = "순위", example = "1")
      Integer rank,
      @Schema(description = "종목 ID", example = "8")
      Long stockId,
      @Schema(description = "종목 코드", example = "005930")
      String ticker,
      @Schema(description = "종목명", example = "삼성전자")
      String name,
      @Schema(description = "적중률", example = "66.67")
      Float hitRate,
      @Schema(description = "수익 거래 수", example = "2")
      Integer winningTrades,
      @Schema(description = "전체 거래 수", example = "3")
      Integer totalTrades
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record ReturnMetricItem(
      @Schema(description = "순위", example = "1")
      Integer rank,
      @Schema(description = "종목 ID", example = "8")
      Long stockId,
      @Schema(description = "종목 코드", example = "005930")
      String ticker,
      @Schema(description = "종목명", example = "삼성전자")
      String name,
      @Schema(description = "지표 값", example = "12.34")
      Float value
  ) {
  }
}
