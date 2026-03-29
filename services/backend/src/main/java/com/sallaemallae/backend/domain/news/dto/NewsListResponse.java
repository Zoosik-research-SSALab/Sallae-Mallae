package com.sallaemallae.backend.domain.news.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "뉴스 목록 응답")
public record NewsListResponse(
    @Schema(description = "필터 조건에 해당하는 전체 기사 수")
    long totalCount,
    @Schema(description = "뉴스 목록")
    List<NewsListItemResponse> news) {
}
