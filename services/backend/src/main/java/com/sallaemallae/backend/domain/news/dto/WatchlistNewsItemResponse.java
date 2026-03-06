package com.sallaemallae.backend.domain.news.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record WatchlistNewsItemResponse(
    Long id,
    String title,
    String snippet,
    String url,
    String publisher,
    OffsetDateTime publishedAt,
    List<String> relatedStocks) {
}
