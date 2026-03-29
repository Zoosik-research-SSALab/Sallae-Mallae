package com.sallaemallae.backend.domain.stock.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "종목 상단 요약 정보 응답")
public record StockOverviewResponse(
    @Schema(description = "종목 ID", example = "24")
    Long stockId,
    @Schema(description = "종목 티커", example = "034220")
    String ticker,
    @Schema(description = "종목명", example = "LG디스플레이")
    String name,
    @Schema(description = "시장 구분", example = "KOSPI")
    String marketType,
    @Schema(description = "GICS 섹터", example = "Information Technology")
    String gicsSector,
    @Schema(description = "종목 카테고리", example = "디스플레이")
    String category,
    @Schema(description = "최신 시세 정보")
    LatestPrice latestPrice,
    @Schema(description = "52주 가격 범위 정보")
    // Jackson snake_case 규칙만으로는 `52w`가 `52_w`처럼 직렬화될 수 있어 API 계약 키를 명시적으로 고정한다.
    @JsonProperty("price_range_52w")
    PriceRange52w priceRange52w
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record LatestPrice(
      @Schema(description = "거래일", example = "2026-03-20")
      LocalDate tradeDate,
      @Schema(description = "종가", example = "11200")
      Integer closePrice,
      @Schema(description = "등락률", example = "1.82")
      Float fluctuationRate
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record PriceRange52w(
      @Schema(description = "52주 최고가", example = "15400")
      Integer highPrice,
      @Schema(description = "52주 최고가 기록일", example = "2025-11-18")
      LocalDate highDate,
      @Schema(description = "52주 최저가", example = "9100")
      Integer lowPrice,
      @Schema(description = "52주 최저가 기록일", example = "2025-04-09")
      LocalDate lowDate,
      @Schema(description = "최고가 대비 현재가 등락률", example = "-27.27")
      Float distanceFromHighRate,
      @Schema(description = "최저가 대비 현재가 등락률", example = "23.08")
      Float distanceFromLowRate
  ) {
  }
}
