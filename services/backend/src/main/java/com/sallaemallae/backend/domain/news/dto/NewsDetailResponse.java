package com.sallaemallae.backend.domain.news.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;

@Schema(description = "뉴스 상세 응답")
public record NewsDetailResponse(
    @Schema(description = "뉴스 ID", example = "1")
    Long id,
    @Schema(description = "뉴스 제목", example = "삼성전자 반도체 실적 발표")
    String title,
    @Schema(description = "뉴스 서문")
    String snippet,
    @Schema(description = "언론사", example = "연합뉴스")
    String publisher,
    @Schema(description = "발행일시")
    OffsetDateTime publishedAt,
    @Schema(description = "원문 URL")
    String url,
    @Schema(description = "관련 종목 목록")
    List<RelatedStock> relatedStocks) {

  @Schema(description = "관련 종목 정보")
  public record RelatedStock(
      @Schema(description = "종목 ID", example = "1")
      Long id,
      @Schema(description = "종목명", example = "삼성전자")
      String name,
      @Schema(description = "종목 코드", example = "005930")
      String ticker) {
  }
}
