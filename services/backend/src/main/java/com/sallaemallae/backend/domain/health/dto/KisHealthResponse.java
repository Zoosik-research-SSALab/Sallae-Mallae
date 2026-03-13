package com.sallaemallae.backend.domain.health.dto;

public record KisHealthResponse(
    boolean configured,
    String mode,
    String restBaseUrl,
    boolean tokenCached,
    boolean approvalKeyCached,
    String sampleTicker,
    Integer samplePrice,
    boolean quoteCacheHit,
    String quoteCacheKey,
    String status,
    String detail
) {
}
