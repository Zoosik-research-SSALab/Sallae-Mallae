package com.sallaemallae.backend.domain.stock.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "종목 키워드 및 관련 뉴스 응답")
public record StockKeywordsResponse(
    @Schema(description = "상위 키워드 목록")
    List<KeywordItem> keywords,
    @Schema(description = "관련 뉴스 목록")
    List<NewsItem> news
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record KeywordItem(
      @Schema(description = "키워드 ID", example = "1")
      Long id,
      @Schema(description = "키워드명", example = "HBM 공급망")
      String name
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record NewsItem(
      @Schema(description = "뉴스 ID", example = "101")
      Long id,
      @Schema(description = "뉴스 제목", example = "삼성전자, 차세대 HBM 양산 본격화 전망")
      String title,
      @Schema(description = "언론사", example = "한국경제")
      String publisher,
      @Schema(description = "발행 시각", example = "2026-03-12T14:30:00+09:00")
      OffsetDateTime publishedAt
  ) {
  }
}
