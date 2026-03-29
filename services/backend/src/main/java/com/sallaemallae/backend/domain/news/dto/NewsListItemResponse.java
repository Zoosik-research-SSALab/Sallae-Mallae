package com.sallaemallae.backend.domain.news.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;

@Schema(description = "뉴스 목록 항목")
public record NewsListItemResponse(
    @Schema(description = "뉴스 ID", example = "1")
    Long id,
    @Schema(description = "뉴스 제목", example = "삼성전자 반도체 실적 발표")
    String title,
    @Schema(description = "언론사", example = "연합뉴스")
    String publisher,
    @Schema(description = "발행일시")
    OffsetDateTime publishedAt,
    @Schema(description = "관련 종목명 목록")
    List<String> relatedStocks) {
}