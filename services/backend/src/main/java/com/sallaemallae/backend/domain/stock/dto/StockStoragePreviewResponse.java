package com.sallaemallae.backend.domain.stock.dto;

import java.time.OffsetDateTime;

public record StockStoragePreviewResponse(
    String targetTable,
    String uniqueKeyColumn,
    String uniqueKeyValue,
    Long stockId,
    String ticker,
    Integer openPrice,
    Integer highPrice,
    Integer lowPrice,
    Integer closePrice,
    Long volume,
    Float fluctuationRate,
    OffsetDateTime createdAt
) {
}
