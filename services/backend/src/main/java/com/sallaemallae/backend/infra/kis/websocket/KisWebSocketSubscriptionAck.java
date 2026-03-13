package com.sallaemallae.backend.infra.kis.websocket;

import java.time.OffsetDateTime;

public record KisWebSocketSubscriptionAck(
    String topic,
    String ticker,
    boolean success,
    String message,
    OffsetDateTime acknowledgedAt
) {
}
