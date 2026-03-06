package com.sallaemallae.backend.domain.news.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record NewsListItemResponse(
    Long id,
    String title,
    String publisher,
    OffsetDateTime publishedAt,
    List<String> relatedStock) {
}
