package com.sallaemallae.backend.domain.health.dto;

public record KisHealthResponse(
    boolean configured,
    String sampleTicker,
    Integer samplePrice,
    boolean quoteCacheHit,
    String status,
    String detail
) {
}
