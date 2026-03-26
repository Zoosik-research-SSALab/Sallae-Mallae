package com.sallaemallae.backend.domain.user.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;

public record WatchlistItemResponse(
    Long stockId,
    String ticker,
    String name,
    @JsonProperty("is_noti_enabled") boolean isNotiEnabled,
    Integer price,
    @JsonProperty("fluctuation_rate") Float fluctuationRate,
    String signal,
    Integer confidence,
    OffsetDateTime createdAt,
    String iconUrl
) {
}
