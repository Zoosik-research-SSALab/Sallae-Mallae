package com.sallaemallae.backend.domain.news.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "뉴스 목록 응답")
public record NewsListResponse(
    @Schema(description = "뉴스 목록")
    List<NewsListItemResponse> news) {
}
