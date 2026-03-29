package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PerformanceTradesResponse(
    @Schema(description = "기존 raw 매매 이벤트 목록")
    List<TradeItem> trades,
    @Schema(description = "상세 UI용 거래 cycle 요약 목록")
    List<TradeCycleItem> tradeCycles
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record TradeItem(
      @Schema(description = "매매 유형", example = "BUY")
      String tradeType,
      @Schema(description = "매매 시각")
      OffsetDateTime tradeTime,
      @Schema(description = "기존 하위 호환용 체결값 필드", example = "4030.0")
      Float tradePriceRate,
      @Schema(description = "매도 시 수익률", example = "3.2", nullable = true)
      Float returnRate
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record TradeCycleItem(
      @Schema(description = "거래 cycle 식별자", example = "143-2026-02-05-01")
      String cycleId,
      @Schema(description = "cycle 상태", example = "holding")
      String status,
      @Schema(description = "해당 cycle의 최초 진입(첫 매수) 시각", nullable = true)
      OffsetDateTime buyDate,
      @Schema(description = "마지막 매도 시각", nullable = true)
      OffsetDateTime sellDate,
      @Schema(description = "해당 cycle의 수량가중 평균 매수가", example = "3925", nullable = true)
      Integer buyPrice,
      @Schema(description = "해당 cycle의 수량가중 평균 매도가", example = "4185", nullable = true)
      Integer sellPrice,
      @Schema(description = "현재가", example = "4185", nullable = true)
      Integer currentPrice,
      @Schema(description = "보유 일수", example = "50", nullable = true)
      Integer holdingDays,
      @Schema(description = "보유 중이면 평가 수익률, 매도 완료면 실현 수익률", example = "6.62", nullable = true)
      Float returnRate,
      @Schema(description = "매수 횟수", example = "2")
      Integer buyCount,
      @Schema(description = "매도 횟수", example = "1")
      Integer sellCount,
      @Schema(description = "남은 보유 수량", example = "30", nullable = true)
      Long remainingQuantity,
      @Schema(description = "부분 매도 이력 여부", example = "true")
      boolean hasPartialSell
  ) {
  }
}
