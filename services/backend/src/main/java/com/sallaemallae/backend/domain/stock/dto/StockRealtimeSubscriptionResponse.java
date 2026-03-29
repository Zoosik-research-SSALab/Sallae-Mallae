package com.sallaemallae.backend.domain.stock.dto;

import java.time.OffsetDateTime;

public record StockRealtimeSubscriptionResponse(
    String ticker,
    String market,
    String topic,
    boolean connected,
    boolean subscriptionRequested,
    boolean subscriptionAcknowledged,
    OffsetDateTime acknowledgedAt,
    String message
) {
}
