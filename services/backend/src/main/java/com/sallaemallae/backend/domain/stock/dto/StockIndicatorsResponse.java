package com.sallaemallae.backend.domain.stock.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "종목 투자 주요 지표 응답")
public record StockIndicatorsResponse(
    @Schema(description = "가치평가 지표")
    Valuation valuation,
    @Schema(description = "수익성 지표")
    Earnings earnings,
    @Schema(description = "배당 지표")
    Dividend dividend
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record Valuation(
      @Schema(description = "주가수익비율", example = "26.1")
      Float per,
      @Schema(description = "주가매출비율", example = "3.5")
      Float psr,
      @Schema(description = "주가순자산비율", example = "2.7")
      Float pbr
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record Earnings(
      @Schema(description = "주당순이익", example = "6563")
      Long eps,
      @Schema(description = "주당순자산", example = "63997")
      Long bps,
      @Schema(description = "자기자본이익률", example = "10.8")
      Float roe
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record Dividend(
      @Schema(description = "배당 기준 기간 라벨", example = "최근 12개월")
      String periodLabel,
      @Schema(description = "배당 지급 횟수", example = "4")
      Integer paymentCount,
      @Schema(description = "배당 지급 월 목록", example = "3월, 6월, 9월, 12월")
      String paymentMonths,
      @Schema(description = "연간 주당 배당금", example = "1668")
      Integer annualDividendPerShare,
      @Schema(description = "배당수익률", example = "0.96")
      Float dividendYield
  ) {
  }
}
