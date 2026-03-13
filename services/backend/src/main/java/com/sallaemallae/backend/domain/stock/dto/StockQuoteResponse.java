package com.sallaemallae.backend.domain.stock.dto;

import java.time.OffsetDateTime;

public record StockQuoteResponse(
    String ticker,
    String name,
    String market,
    Integer currentPrice,
    Integer previousClosePrice,
    Integer changePrice,
    Float changeRate,
    Integer openPrice,
    Integer highPrice,
    Integer lowPrice,
    Long volume,
    OffsetDateTime asOf,
    boolean cacheHit,
    String cacheKey,
    String source
) {
}
