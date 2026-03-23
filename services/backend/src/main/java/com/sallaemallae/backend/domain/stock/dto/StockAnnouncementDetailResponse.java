package com.sallaemallae.backend.domain.stock.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "종목 공시 상세 응답")
public record StockAnnouncementDetailResponse(
    @Schema(description = "공시 ID", example = "1")
    Long id,
    @Schema(description = "공시 제목", example = "현금ㆍ현물배당결정 (결산배당)")
    String title,
    @Schema(description = "공시일", example = "2026-02-15")
    LocalDate announcedAt,
    @Schema(description = "공시 본문", example = "공시 상세 본문")
    String content,
    @Schema(description = "공시 원문 URL", example = "https://example.com/announcement/1")
    String url
) {
}
