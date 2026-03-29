package com.sallaemallae.backend.infra.kis.websocket;

import java.time.OffsetDateTime;

public record KisRealtimeTradeTickData(
    String marketCode,
    String ticker,
    OffsetDateTime tradedAt,
    Integer currentPrice,
    Integer openPrice,
    Integer highPrice,
    Integer lowPrice,
    Integer changePrice,
    Float changeRate,
    Long tradeVolume,
    Long accumulatedVolume,
    Float executionStrength,
    String marketOperationCode,
    boolean halted,
    String source
) {
}
