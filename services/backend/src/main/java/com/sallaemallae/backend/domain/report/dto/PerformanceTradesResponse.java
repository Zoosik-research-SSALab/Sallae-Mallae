package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.time.OffsetDateTime;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PerformanceTradesResponse(
    List<TradeItem> trades
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record TradeItem(
      String tradeType,
      OffsetDateTime tradeTime,
      Float tradePriceRate,
      Float returnRate
  ) {
  }
}
