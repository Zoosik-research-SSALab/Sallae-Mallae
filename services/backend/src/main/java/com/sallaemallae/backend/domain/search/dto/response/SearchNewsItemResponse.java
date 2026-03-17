package com.sallaemallae.backend.domain.search.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;

public record SearchNewsItemResponse(
    Long id,
    String title,
    String publisher,
    @JsonProperty("published_at") OffsetDateTime publishedAt
) {
}
