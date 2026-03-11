package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.time.LocalDate;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PerformanceResponse(
    Float cumulativeReturn,
    Float winRate,
    Float recentReturn,
    List<ChartPoint> chart
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record ChartPoint(
      LocalDate date,
      Float cumulativeReturn,
      String tradeType
  ) {
  }
}
