package com.sallaemallae.backend.domain.stock.dto;

import java.time.OffsetDateTime;

public record StockDetailResponse(
    Long id,
    String ticker,
    String name,
    String marketType,
    String gicsSector,
    String category,
    OffsetDateTime baseTime
) {
}
