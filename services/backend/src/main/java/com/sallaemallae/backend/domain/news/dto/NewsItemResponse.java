package com.sallaemallae.backend.domain.news.dto;

import java.time.OffsetDateTime;

public record NewsItemResponse(Long id, String title, String publisher, OffsetDateTime publishedAt) {
}
