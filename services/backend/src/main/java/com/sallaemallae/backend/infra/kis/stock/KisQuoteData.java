package com.sallaemallae.backend.infra.kis.stock;

import java.time.OffsetDateTime;

public record KisQuoteData(
    String marketCode,
    String ticker,
    String name,
    Integer currentPrice,
    Integer previousClosePrice,
    Integer changePrice,
    Float changeRate,
    Integer openPrice,
    Integer highPrice,
    Integer lowPrice,
    Long volume,
    OffsetDateTime asOf,
    String source
) {
}
