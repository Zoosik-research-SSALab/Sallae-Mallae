package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.time.OffsetDateTime;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ChairmanReportResponse(
    Chairman chairman,
    List<FinalStance> finalStances,
    OffsetDateTime createdAt
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record Chairman(
      String signal,
      Float confidence,
      String summary
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record FinalStance(
      String agentId,
      String agentName,
      String stance
  ) {
  }
}
