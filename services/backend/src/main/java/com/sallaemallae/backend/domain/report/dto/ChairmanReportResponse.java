package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ChairmanReportResponse(
    @Schema(description = "의장 최종 분석 정보")
    Chairman chairman,
    @Schema(description = "위원별 최종 입장 목록")
    List<FinalStance> finalStances,
    @Schema(description = "리포트 생성 시각")
    OffsetDateTime createdAt
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record Chairman(
      @Schema(description = "의장 최종 신호", example = "BUY")
      String signal,
      @Schema(description = "의장 분석 신뢰도", example = "0.82")
      Float confidence,
      @Schema(description = "의장 최종 의견 요약")
      String summary
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record FinalStance(
      @Schema(description = "위원 식별자", example = "BULL")
      String agentId,
      @Schema(description = "위원 이름", example = "매수 위원")
      String agentName,
      @Schema(description = "위원 최종 입장", example = "BUY")
      String stance
  ) {
  }
}
