package com.sallaemallae.backend.domain.news.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record NewsDetailResponse(
    Long id,
    String title,
    String snippet,
    String publisher,
    OffsetDateTime publishedAt,
    String url,
    List<RelatedStock> relatedStocks) {

  public record RelatedStock(Long id, String name, String ticker) {
  }
}
