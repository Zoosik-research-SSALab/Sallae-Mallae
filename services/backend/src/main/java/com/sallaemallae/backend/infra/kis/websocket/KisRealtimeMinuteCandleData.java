package com.sallaemallae.backend.infra.kis.websocket;

import java.time.OffsetDateTime;

public record KisRealtimeMinuteCandleData(
    String marketCode,
    String ticker,
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
