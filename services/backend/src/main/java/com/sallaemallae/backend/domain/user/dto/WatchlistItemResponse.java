package com.sallaemallae.backend.domain.user.dto;

import java.time.OffsetDateTime;

public record WatchlistItemResponse(
    Long stockId,
    String ticker,
    String name,
    boolean isNotiEnabled,
    OffsetDateTime createdAt
) {
}
