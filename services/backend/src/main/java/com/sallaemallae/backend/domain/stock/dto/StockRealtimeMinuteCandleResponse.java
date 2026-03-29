package com.sallaemallae.backend.domain.stock.dto;

import java.time.OffsetDateTime;

public record StockRealtimeMinuteCandleResponse(
    OffsetDateTime bucketStart,
    OffsetDateTime bucketEnd,
    Integer openPrice,
    Integer highPrice,
    Integer lowPrice,
    Integer closePrice,
    Long minuteVolume,
    Long accumulatedVolume,
    Float changeRate,
    Integer tickCount,
    OffsetDateTime lastTradeAt,
    boolean closed,
    String source
) {
}
