package com.sallaemallae.backend.domain.news.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "트렌딩 키워드 응답")
public record TrendingKeywordsResponse(
    @Schema(description = "트렌딩 키워드 목록")
    List<TrendingItem> trending) {

  @Schema(description = "트렌딩 키워드 항목")
  public record TrendingItem(
      @Schema(description = "순위", example = "1")
      int rank,
      @Schema(description = "키워드", example = "AI")
      String keyword) {
  }
}
