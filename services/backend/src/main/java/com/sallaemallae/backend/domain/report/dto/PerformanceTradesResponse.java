package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PerformanceTradesResponse(
    @Schema(description = "매매 내역 목록")
    List<TradeItem> trades
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record TradeItem(
      @Schema(description = "매매 유형", example = "BUY")
      String tradeType,
      @Schema(description = "매매 시각")
      OffsetDateTime tradeTime,
      @Schema(description = "체결 비율값", example = "0.15")
      Float tradePriceRate,
      @Schema(description = "매도 시 수익률", example = "3.2", nullable = true)
      Float returnRate
  ) {
  }
}
