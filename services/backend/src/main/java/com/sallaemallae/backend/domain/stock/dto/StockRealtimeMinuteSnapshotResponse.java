package com.sallaemallae.backend.domain.stock.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record StockRealtimeMinuteSnapshotResponse(
    String ticker,
    String market,
    String topic,
    boolean connected,
    boolean subscriptionRequested,
    boolean subscriptionAcknowledged,
    OffsetDateTime acknowledgedAt,
    OffsetDateTime lastMessageAt,
    String lastMessagePreview,
    OffsetDateTime latestTickAt,
    StockRealtimeMinuteCandleResponse currentMinuteCandle,
    List<StockRealtimeMinuteCandleResponse> recentClosedMinuteCandles
) {
}
