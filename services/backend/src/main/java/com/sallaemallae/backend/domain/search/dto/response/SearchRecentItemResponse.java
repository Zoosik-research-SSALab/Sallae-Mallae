package com.sallaemallae.backend.domain.search.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;

public record SearchRecentItemResponse(
    String keyword,
    @JsonProperty("searched_at") OffsetDateTime searchedAt,
    @JsonProperty("stock_id") Long stockId
) {
}
