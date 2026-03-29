package com.sallaemallae.backend.domain.stock.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "종목 공시 목록 응답")
public record StockAnnouncementsResponse(
    @Schema(description = "총 공시 개수", example = "12")
    long total,
    @Schema(description = "공시 목록")
    List<AnnouncementItem> announcements
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record AnnouncementItem(
      @Schema(description = "공시 ID", example = "1")
      Long id,
      @Schema(description = "공시 제목", example = "현금ㆍ현물배당결정 (결산배당)")
      String title,
      @Schema(description = "공시일", example = "2026-02-15")
      LocalDate announcedAt
  ) {
  }
}
