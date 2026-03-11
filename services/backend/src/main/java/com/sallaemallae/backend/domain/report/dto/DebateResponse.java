package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record DebateResponse(
    List<Round> rounds
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record Round(
      Integer roundNo,
      List<Agent> agents
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record Agent(
      String name,
      String opinion,
      String summary
  ) {
  }
}
