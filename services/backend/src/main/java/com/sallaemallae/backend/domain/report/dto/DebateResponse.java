package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record DebateResponse(
    @Schema(description = "라운드별 토론 기록")
    List<Round> rounds
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record Round(
      @Schema(description = "토론 라운드 번호", example = "1")
      Integer roundNo,
      @Schema(description = "해당 라운드의 위원별 의견 목록")
      List<Agent> agents
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record Agent(
      @Schema(description = "위원 이름", example = "매수 위원")
      String name,
      @Schema(description = "위원 발언 내용")
      String opinion,
      @Schema(description = "위원 발언 요약")
      String summary
  ) {
  }
}
