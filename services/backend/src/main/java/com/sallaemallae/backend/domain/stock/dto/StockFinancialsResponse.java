package com.sallaemallae.backend.domain.stock.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "종목 실적 응답")
public record StockFinancialsResponse(
    @Schema(description = "실적 목록")
    List<FinancialItem> financials
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record FinancialItem(
      @Schema(description = "연도", example = "2025")
      Integer year,
      @Schema(description = "분기", example = "1")
      Integer quarter,
      @Schema(description = "매출", example = "302100000000")
      Long revenue,
      @Schema(description = "영업이익", example = "32400000000")
      Long operatingProfit
  ) {
  }
}
